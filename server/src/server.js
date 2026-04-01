const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const app = require('./app');
const { initDb } = require('./config/db');
const { checkRedis } = require('./config/redis');
const logger = require('./utils/logger');
const { startNotificationEventEngine } = require('./services/notificationEventEngine.service');
const { startNotificationScheduler } = require('./services/notificationScheduler.service');

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    logger.info('Starting Mwanga server initialization...');

    await initDb();
    logger.info('Database connection verified.');

    try {
      await checkRedis();
      logger.info('Redis connection verified.');
    } catch (redisErr) {
      logger.warn(`Redis initialization failed: ${redisErr.message}. Continuing without Redis...`);
    }

    startNotificationEventEngine();
    startNotificationScheduler();

    const server = app.listen(PORT, () => {
      logger.info(`Mwanga server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
      });
    });
  } catch (err) {
    logger.error('CRITICAL: Failed to initialize database:');
    logger.error(err);
    process.exit(1);
  }
}

startServer();
