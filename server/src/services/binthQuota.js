const { db } = require('../config/db');
const { hasUnlimitedSms } = require('./smsQuota.service');
const logger = require('../utils/logger');

// Free plan: answers per person per day from Mwanga's own AI keys. Paid plans,
// active trials and people who connected their own AI key are not limited.
//
// The counter is shared by every server instance and survives restarts: Redis
// (Upstash) first, then a Postgres table. If neither can count, the answer is
// "not allowed" (the person gets the local answer), so a broken counter never
// turns into unlimited AI cost.
const FREE_DAILY_AI_MESSAGES = Number(process.env.BINTH_FREE_DAILY_LIMIT || 20);

let _redis;
function getRedis() {
  if (_redis !== undefined) return _redis;
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) { _redis = null; return _redis; }
    _redis = require('../config/redis').redis;
  } catch { _redis = null; }
  return _redis;
}

async function initBinthQuotaSchema() {
  try {
    await db.execute({
      sql: `CREATE TABLE IF NOT EXISTS binth_daily_usage (
        user_id INTEGER NOT NULL,
        day DATE NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, day)
      )`,
      args: [],
    });
    await db.execute({ sql: 'ALTER TABLE binth_daily_usage ENABLE ROW LEVEL SECURITY', args: [] });
    // Old days are not needed.
    await db.execute({ sql: "DELETE FROM binth_daily_usage WHERE day < CURRENT_DATE - INTERVAL '7 days'", args: [] });
  } catch (error) {
    logger.warn(`Failed to initialize binth_daily_usage table: ${error.message}`);
  }
}

async function hasPaidPlan(householdId, now) {
  const res = await db.execute({
    sql: `SELECT key, value FROM settings WHERE household_id = ?
          AND key IN ('subscription_tier', 'subscription_expires_at', 'trial_ends_at')`,
    args: [householdId],
  });
  return hasUnlimitedSms(Object.fromEntries((res.rows || []).map(r => [r.key, r.value])), now);
}

async function incrementInRedis(userId, day) {
  const r = getRedis();
  if (!r) return null;
  try {
    const key = `binth:daily:${userId}:${day}`;
    const n = await r.incr(key);
    if (Number(n) === 1) await r.expire(key, 36 * 3600);
    return Number(n);
  } catch (err) {
    logger.warn({ err: err.message }, '[BinthQuota] Redis failed; using Postgres');
    return null;
  }
}

async function incrementInDb(userId, day) {
  const res = await db.execute({
    sql: `INSERT INTO binth_daily_usage (user_id, day, count) VALUES (?, ?, 1)
          ON CONFLICT (user_id, day) DO UPDATE SET count = binth_daily_usage.count + 1
          RETURNING count`,
    args: [userId, day],
  });
  const n = Number(res?.rows?.[0]?.count);
  if (!Number.isFinite(n)) throw new Error('quota counter returned no value');
  return n;
}

// Counts this message and says whether Mwanga's AI may answer it.
async function checkDailyAiQuota(householdId, userId, now = new Date()) {
  if (!(FREE_DAILY_AI_MESSAGES > 0)) return { allowed: true };
  const limit = FREE_DAILY_AI_MESSAGES;
  try {
    if (await hasPaidPlan(householdId, now)) return { allowed: true };
    const day = now.toISOString().slice(0, 10);
    const used = (await incrementInRedis(userId, day)) ?? (await incrementInDb(userId, day));
    return { allowed: used <= limit, used, limit };
  } catch (err) {
    logger.error({ err: err.message }, '[BinthQuota] Could not count; refusing Mwanga AI for this message');
    return { allowed: false, limit, unavailable: true };
  }
}

module.exports = { checkDailyAiQuota, initBinthQuotaSchema, FREE_DAILY_AI_MESSAGES };
