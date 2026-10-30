-- credit.service.js writes risk_score when a credit application is submitted,
-- but the column was never created, so every submission failed.
ALTER TABLE public.credit_applications ADD COLUMN IF NOT EXISTS risk_score integer;
