require('dotenv').config();
const app = require('./app');
const { initDb } = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

// Initialize Database
initDb();

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
