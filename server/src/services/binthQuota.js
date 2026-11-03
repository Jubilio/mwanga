const { db } = require('../config/db');
const { hasUnlimitedSms } = require('./smsQuota.service');
const logger = require('../utils/logger');

// Free plan: answers per person per day from Mwanga's own AI keys. Paid plans,
// active trials and people who connected their own AI key are not limited.
const FREE_DAILY_AI_MESSAGES = Number(process.env.BINTH_FREE_DAILY_LIMIT || 20);
const memory = new Map();

let _redis;
function getRedis() {
  if (_redis !== undefined) return _redis;
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) { _redis = null; return _redis; }
    _redis = require('../config/redis').redis;
  } catch { _redis = null; }
  return _redis;
}

async function hasPaidPlan(householdId, now) {
  const res = await db.execute({
    sql: `SELECT key, value FROM settings WHERE household_id = ?
          AND key IN ('subscription_tier', 'subscription_expires_at', 'trial_ends_at')`,
    args: [householdId],
  });
  return hasUnlimitedSms(Object.fromEntries((res.rows || []).map(r => [r.key, r.value])), now);
}

async function increment(key) {
  try {
    const r = getRedis();
    if (r) {
      const n = await r.incr(key);
      if (n === 1) await r.expire(key, 36 * 3600);
      return Number(n);
    }
  } catch (err) {
    logger.debug({ err: err.message }, '[BinthQuota] Redis failed');
  }
  if (memory.size > 20000) memory.clear();
  const n = (memory.get(key) || 0) + 1;
  memory.set(key, n);
  return n;
}

// Counts this message and says whether Mwanga's AI may answer it.
async function checkDailyAiQuota(householdId, userId, now = new Date()) {
  if (!(FREE_DAILY_AI_MESSAGES > 0)) return { allowed: true };
  if (await hasPaidPlan(householdId, now)) return { allowed: true };
  const day = now.toISOString().slice(0, 10);
  const used = await increment(`binth:daily:${userId}:${day}`);
  return { allowed: used <= FREE_DAILY_AI_MESSAGES, used, limit: FREE_DAILY_AI_MESSAGES };
}

function resetQuotaMemory() { memory.clear(); }

module.exports = { checkDailyAiQuota, resetQuotaMemory, FREE_DAILY_AI_MESSAGES };
