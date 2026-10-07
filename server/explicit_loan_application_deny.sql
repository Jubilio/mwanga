-- Already applied to Mwanga: explicitly_deny_direct_loan_application_access.
-- Grants remain revoked; this restrictive policy also denies direct browser access.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='loan_applications' AND policyname='Block direct Data API access'
  ) THEN
    CREATE POLICY "Block direct Data API access"
    ON public.loan_applications AS RESTRICTIVE FOR ALL
    TO anon, authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;
