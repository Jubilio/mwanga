const { db } = require('./db');
const logger = require('../utils/logger');

// Almost every screen reads by household_id, and the transaction list is sorted by
// date. Without these indexes Postgres scans the whole table, which is fine with a
// few hundred rows but grows with every user. IF NOT EXISTS makes this safe to run
// on every start; a missing table or column only skips that one index.
// Same list as migrations/2026-11-18-performance-indexes.sql.
const PERFORMANCE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_transactions_household_date ON transactions (household_id, date DESC)',
  'CREATE INDEX IF NOT EXISTS idx_accounts_household ON accounts (household_id)',
  'CREATE INDEX IF NOT EXISTS idx_goals_household ON goals (household_id)',
  'CREATE INDEX IF NOT EXISTS idx_debts_household ON debts (household_id)',
  'CREATE INDEX IF NOT EXISTS idx_budgets_household ON budgets (household_id)',
  'CREATE INDEX IF NOT EXISTS idx_rentals_household ON rentals (household_id)',
  'CREATE INDEX IF NOT EXISTS idx_xitiques_household ON xitiques (household_id)',
  'CREATE INDEX IF NOT EXISTS idx_users_household ON users (household_id)',
];

async function initPerformanceIndexes() {
  for (const sql of PERFORMANCE_INDEXES) {
    try {
      await db.execute({ sql, args: [] });
    } catch (err) {
      logger.warn(`Index skipped (${sql.split(' ON ')[1]}): ${err.message}`);
    }
  }
}

module.exports = { initPerformanceIndexes, PERFORMANCE_INDEXES };
