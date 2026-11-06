#!/usr/bin/env bash
# Dumps the production database and proves the dump can be restored.
#
#   SOURCE_URL   production database (Supabase: use the *session* pooler URL, port 5432)
#   RESTORE_URL  an EMPTY throwaway database the dump is restored into
#   OUT          where to write the dump (pg_dump custom format)
#
# Exit code 1 if the dump fails, a table is missing after the restore, or a
# table's row count differs from production by more than max(5 rows, 1 %)
# (production keeps receiving writes while this runs).
set -euo pipefail
: "${SOURCE_URL:?set SOURCE_URL}" "${RESTORE_URL:?set RESTORE_URL}" "${OUT:?set OUT}"

echo "== Dump (public schema)"
pg_dump --format=custom --no-owner --no-privileges --schema=public --file="$OUT" "$SOURCE_URL"
ls -lh "$OUT"

echo "== Prepare the throwaway database (what Supabase provides outside public)"
psql -v ON_ERROR_STOP=1 -q "$RESTORE_URL" <<'SQL'
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULL::uuid';
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS 'SELECT NULL::text';
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS 'SELECT NULL::jsonb';
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
SQL

echo "== Restore"
set +e
pg_restore --no-owner --no-privileges --dbname="$RESTORE_URL" "$OUT" 2> restore.log
set -e
# "schema public already exists" is expected (every database has it).
errors=$(grep 'error:' restore.log | grep -vc 'schema "public" already exists' || true)
echo "pg_restore reported $errors unexpected error(s); the row counts below are the real test"
[ "$errors" -gt 0 ] && grep -A1 'error:' restore.log | grep -v 'schema "public" already exists' | head -20 || true

COUNT_SQL=$(cat <<'SQL'
SELECT format('SELECT %L AS t, count(*) AS n FROM public.%I', table_name, table_name)
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name
SQL
)
counts() {
  local url="$1" queries
  queries=$(psql -At "$url" -c "$COUNT_SQL" | paste -sd'|' | sed 's/|/ UNION ALL /g')
  [ -z "$queries" ] && return 0
  psql -At -F ' ' "$url" -c "$queries ORDER BY 1"
}

echo "== Compare row counts"
trap 'rm -f source-counts.txt restore-counts.txt' EXIT
counts "$SOURCE_URL" > source-counts.txt
counts "$RESTORE_URL" > restore-counts.txt
status=0
tables=0
while read -r table n; do
  tables=$((tables + 1))
  restored=$(awk -v t="$table" '$1 == t { print $2 }' restore-counts.txt)
  if [ -z "$restored" ]; then echo "MISSING  $table"; status=1; continue; fi
  diff=$(( n > restored ? n - restored : restored - n ))
  allowed=$(( n / 100 > 5 ? n / 100 : 5 ))
  if [ "$diff" -gt "$allowed" ]; then echo "MISMATCH $table (difference: $diff rows)"; status=1; fi
done < source-counts.txt
# Only the number of tables is printed: workflow logs of a public repository are public.
echo "Checked $tables tables."
[ "$tables" -gt 0 ] || { echo "No tables found in production: wrong SOURCE_URL?"; exit 1; }
[ "$status" -eq 0 ] && echo "RESTORE OK" || echo "RESTORE FAILED"
exit "$status"
