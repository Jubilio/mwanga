const { Redis } = require('@upstash/redis');
const logger = require('../utils/logger');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Lança o erro para quem chama: antes era engolido aqui e o arranque dizia
// "Redis connection verified" mesmo quando a ligação falhava.
const checkRedis = async () => {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('UPSTASH_REDIS_REST_URL ou UPSTASH_REDIS_REST_TOKEN em falta');
  }
  await redis.set('health_check', Date.now());
  const res = await redis.get('health_check');
  if (!res) throw new Error('Upstash respondeu sem o valor de teste');
  logger.info('Connected to Upstash Redis 🚀');
};

module.exports = { redis, checkRedis };
