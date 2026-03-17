const { Redis } = require('@upstash/redis');
const logger = require('../utils/logger');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const checkRedis = async () => {
  try {
    await redis.set('health_check', Date.now());
    const res = await redis.get('health_check');
    if (res) {
      logger.info('Connected to Upstash Redis 🚀');
    }
  } catch (error) {
    logger.error('Failed to connect to Redis:', error.message);
  }
};

module.exports = { redis, checkRedis };
