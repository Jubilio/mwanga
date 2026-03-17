const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const app = require('./app');
const { initDb } = require('./config/db');
const { checkRedis } = require('./config/redis');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

// Initialize Database & Start Server
initDb()
  .then(async () => {
    await checkRedis();
    const server = app.listen(PORT, () => {
      logger.info(`Mwanga ✦ Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
    });

    // Graceful Shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
      });
    });
  })
  .catch((err) => {
    logger.error('Failed to initialize database:', err);
    process.exit(1);
  });
