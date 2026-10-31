-- Emails do admin para os utilizadores. O servidor cria isto sozinho ao arrancar
-- (emailCampaign.service.js); este ficheiro serve para aplicar à mão se preferir.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_opt_out_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS email_campaigns (
  id SERIAL PRIMARY KEY,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sending',
  total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  campaign_id INTEGER NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  sent_at TIMESTAMP,
  PRIMARY KEY (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_email_recipients_status ON email_campaign_recipients (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_email_recipients_sent_at ON email_campaign_recipients (sent_at);

-- Sem políticas: a API pública do Supabase não lê estas tabelas; o backend (dono) continua a ler.
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_recipients ENABLE ROW LEVEL SECURITY;
