const logger = require('./logger');

// Scheduled jobs (notification sweeps, Binth advisor) run inside the web process.
// With two instances on Render, or during a deploy when old and new overlap,
// each job would run twice and people would get duplicate notifications.
// A Postgres advisory lock lets only one instance run a given job at a time.
//
// The lock is transaction-scoped (pg_try_advisory_xact_lock): it works through
// the Supabase transaction pooler and is released automatically on COMMIT,
// ROLLBACK or a dropped connection, so it can never stay stuck.
const LOCK_NAMESPACE = 7724; // arbitrary, keeps Mwanga's locks apart

function lockKey(name) {
  let hash = 0;
  for (const ch of name) hash = (Math.imul(31, hash) + ch.charCodeAt(0)) | 0;
  return hash;
}

async function runExclusive(name, work, { pool = require('../config/db').pool } = {}) {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    logger.warn(`[Jobs] ${name} skipped: no database connection (${err.message})`);
    return { ran: false };
  }

  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT pg_try_advisory_xact_lock($1, $2) AS locked',
      [LOCK_NAMESPACE, lockKey(name)]
    );
    if (!rows[0]?.locked) {
      await client.query('ROLLBACK');
      logger.info(`[Jobs] ${name} skipped: already running on another instance`);
      return { ran: false };
    }
    try {
      const result = await work();
      return { ran: true, result };
    } finally {
      await client.query('COMMIT').catch(() => {});
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { runExclusive, lockKey, LOCK_NAMESPACE };
