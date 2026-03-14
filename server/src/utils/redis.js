const { Redis } = require('@upstash/redis');
const logger = require('./logger');

let redis;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    logger.info('Redis (Upstash) initialized');
  } else {
    logger.warn('Redis credentials missing. Caching will be disabled.');
  }
} catch (error) {
  logger.error('Failed to initialize Redis:', error);
}

module.exports = redis;
