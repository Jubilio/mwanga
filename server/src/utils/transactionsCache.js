const redis = require('./redis');
const logger = require('./logger');

// The transaction list is cached per page and per filter. Deleting one key only
// cleared the first page, so a filtered or later page could show stale data for
// five minutes after a change. Each household now has a version number that is
// part of every cache key; a write bumps it and every cached page goes stale at once.
const versionKey = (householdId) => `transactions:ver:${householdId}`;

async function getTransactionsCacheVersion(householdId) {
  if (!redis) return 0;
  try {
    return Number(await redis.get(versionKey(householdId))) || 0;
  } catch (err) {
    logger.warn({ err }, 'Redis transactions cache version read failed');
    return null; // null = do not use the cache for this request
  }
}

async function invalidateTransactionsCache(householdId) {
  if (!redis || !householdId) return;
  try {
    await redis.incr(versionKey(householdId));
  } catch (err) {
    logger.warn({ err }, 'Redis transactions cache invalidation failed');
  }
}

module.exports = { getTransactionsCacheVersion, invalidateTransactionsCache, versionKey };
