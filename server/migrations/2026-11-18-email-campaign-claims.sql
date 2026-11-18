-- Email campaigns: recipients are claimed before sending so two instances never
-- email the same person. Also applied on server start by initEmailCampaignSchema.
ALTER TABLE email_campaign_recipients ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP;
