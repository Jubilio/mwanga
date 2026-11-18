-- Performance indexes (2026-11-18). Also applied automatically on server start by
-- src/config/indexes.js. Safe to run by hand: every statement uses IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS idx_transactions_household_date ON transactions (household_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_household ON accounts (household_id);
CREATE INDEX IF NOT EXISTS idx_goals_household ON goals (household_id);
CREATE INDEX IF NOT EXISTS idx_debts_household ON debts (household_id);
CREATE INDEX IF NOT EXISTS idx_budgets_household ON budgets (household_id);
CREATE INDEX IF NOT EXISTS idx_rentals_household ON rentals (household_id);
CREATE INDEX IF NOT EXISTS idx_xitiques_household ON xitiques (household_id);
CREATE INDEX IF NOT EXISTS idx_users_household ON users (household_id);
[07:06:38] [31mERROR[39m: [36mDATABASE_URL is missing! PostgreSQL connection cannot be established.[39m
[07:06:38] [32mINFO[39m: [36mDatabase Config (Stable): Pool Max=25, SSL=false, Timeout=30s[39m
