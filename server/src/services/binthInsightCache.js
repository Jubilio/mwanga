const logger = require('../utils/logger');

// Page insights (the Binth card on each page) are cached so opening a page does
// not call the AI every time. Redis (Upstash) when configured, memory otherwise.
const AI_TTL_SECONDS = 6 * 60 * 60;
const LOCAL_TTL_SECONDS = 10 * 60; // local-rules answers: retry the AI sooner
const MAX_MEMORY_ENTRIES = 2000;

const memory = new Map();

let _redis;
function getRedis() {
  if (_redis !== undefined) return _redis;
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) { _redis = null; return _redis; }
    _redis = require('../config/redis').redis;
  } catch {
    _redis = null;
  }
  return _redis;
}

function cacheKey({ householdId, userId, page, language, version }) {
  return `binth:insight:${householdId}:${userId}:${page}:${language}:${version}`;
}

async function getCachedInsight(key) {
  try {
    const r = getRedis();
    if (r) {
      const value = await r.get(key);
      if (value) return typeof value === 'string' ? JSON.parse(value) : value;
      return null;
    }
  } catch (err) {
    logger.debug({ err: err.message }, '[BinthInsightCache] Redis read failed');
  }
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) { memory.delete(key); return null; }
  return entry.value;
}

async function setCachedInsight(key, value) {
  const ttl = value?.data?.ai_status?.state === 'offline' ? LOCAL_TTL_SECONDS : AI_TTL_SECONDS;
  try {
    const r = getRedis();
    if (r) { await r.set(key, JSON.stringify(value), { ex: ttl }); return; }
  } catch (err) {
    logger.debug({ err: err.message }, '[BinthInsightCache] Redis write failed');
  }
  if (memory.size >= MAX_MEMORY_ENTRIES) memory.delete(memory.keys().next().value);
  memory.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
}

function clearMemoryCache() { memory.clear(); }

module.exports = { cacheKey, getCachedInsight, setCachedInsight, clearMemoryCache, AI_TTL_SECONDS, LOCAL_TTL_SECONDS };
