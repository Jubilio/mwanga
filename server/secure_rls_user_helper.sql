-- PROPOSED: requires explicit approval before applying to production.
-- ALTER FUNCTION SET SCHEMA preserves its OID and existing policy dependencies.
-- Keep mwanga_private outside Data API Exposed schemas.
-- This only changes the existing auth_id mapping, not user data or other users policies.
BEGIN;
CREATE SCHEMA IF NOT EXISTS mwanga_private;
REVOKE ALL ON SCHEMA mwanga_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA mwanga_private TO authenticated;
DO $$
BEGIN
  IF to_regprocedure('public.get_my_user_id()') IS NOT NULL THEN
    IF to_regprocedure('mwanga_private.get_my_user_id()') IS NOT NULL THEN
      RAISE EXCEPTION 'Both helper functions exist; review dependencies before proceeding';
    END IF;
    ALTER FUNCTION public.get_my_user_id() SET SCHEMA mwanga_private;
  ELSIF to_regprocedure('mwanga_private.get_my_user_id()') IS NULL THEN
    RAISE EXCEPTION 'User ID helper is missing';
  END IF;
END $$;
CREATE OR REPLACE FUNCTION mwanga_private.get_my_user_id()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id FROM public.users AS u
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND u.auth_id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION mwanga_private.get_my_user_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION mwanga_private.get_my_user_id() TO authenticated;
COMMIT;
