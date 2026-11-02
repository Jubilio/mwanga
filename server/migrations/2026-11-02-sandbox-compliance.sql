-- O servidor cria isto sozinho no arranque (secureFiles.service.js e
-- credit.service.js). Este ficheiro serve para aplicar à mão no Supabase,
-- se preferir.

-- Documentos enviados (KYC, crédito, feedback) cifrados com AES-256-GCM.
CREATE TABLE IF NOT EXISTS secure_files (
  filename TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  user_id INTEGER,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  content BYTEA NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_secure_files_user ON secure_files (user_id);
ALTER TABLE secure_files ENABLE ROW LEVEL SECURITY;

-- Consentimento para o score e referência do contrato do parceiro licenciado.
ALTER TABLE public.credit_applications ADD COLUMN IF NOT EXISTS risk_score integer;
ALTER TABLE public.credit_applications ADD COLUMN IF NOT EXISTS score_consent_at TIMESTAMP;
ALTER TABLE public.credit_applications ADD COLUMN IF NOT EXISTS partner_reference TEXT;
ALTER TABLE public.credit_applications ADD COLUMN IF NOT EXISTS partner_disbursed_at TIMESTAMP;
