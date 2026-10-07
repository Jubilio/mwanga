-- Reproducible backend-only protection for public.loan_applications.
-- Applied to the Mwanga Supabase project using migration
-- secure_loan_applications_backend_only.
-- Express uses a privileged PostgreSQL connection and enforces household access.
-- No browser Data API policies are needed for this access model.
BEGIN;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.loan_applications FROM PUBLIC, anon, authenticated;
COMMIT;

-- Expected: rls_enabled=true; both browser roles have no privileges.
SELECT c.relrowsecurity AS rls_enabled,
       has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS anon_has_access,
       has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS authenticated_has_access
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'loan_applications';
