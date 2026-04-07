-- mwanga/server/migrations/2026-04-07-notification-engine-v2.sql

-- 1. Push Subscriptions: Allow NULL household_id and add user identity priority
ALTER TABLE push_subscriptions ALTER COLUMN household_id DROP NOT NULL;

-- 2. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_hours_start SMALLINT DEFAULT 22,
  quiet_hours_end SMALLINT DEFAULT 7,
  max_push_per_day SMALLINT NOT NULL DEFAULT 2,
  minimum_gap_minutes SMALLINT NOT NULL DEFAULT 180,
  allow_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  allow_budget_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  allow_debt_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  allow_goal_updates BOOLEAN NOT NULL DEFAULT TRUE,
  allow_reengagement BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Notification Events (The raw events from the system)
CREATE TABLE IF NOT EXISTS notification_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80),
  entity_id BIGINT,
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Notification Candidates (The 'brain' queue)
CREATE TABLE IF NOT EXISTS notification_candidates (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES notification_events(id) ON DELETE SET NULL,
  type VARCHAR(80) NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority SMALLINT NOT NULL DEFAULT 0,
  score NUMERIC(8,2) NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending, skipped, sent, cancelled, expired
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  conversion_type VARCHAR(80),
  skip_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Delivery Logs (Traceability)
CREATE TABLE IF NOT EXISTS notification_delivery_logs (
  id BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT REFERENCES notification_candidates(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id BIGINT REFERENCES push_subscriptions(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL, -- sent, failed, opened, converted
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. User Stats (Behavioral context for scoring)
CREATE TABLE IF NOT EXISTS user_notification_stats (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_push_sent_at TIMESTAMPTZ,
  push_sent_today INTEGER NOT NULL DEFAULT 0,
  push_opened_last_7d INTEGER NOT NULL DEFAULT 0,
  push_sent_last_7d INTEGER NOT NULL DEFAULT 0,
  push_converted_last_7d INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  typical_active_hour SMALLINT,
  streak_days INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initialize preferences and stats for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM users
ON CONFLICT DO NOTHING;

INSERT INTO user_notification_stats (user_id)
SELECT id FROM users
ON CONFLICT DO NOTHING;
