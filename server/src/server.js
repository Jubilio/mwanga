const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { initSentry, captureException, flushSentry } = require('./utils/sentry');
initSentry();
const cron = require('node-cron');
const app = require('./app');
const { initDb, pool } = require('./config/db');
const { checkRedis } = require('./config/redis');
const logger = require('./utils/logger');
const { startNotificationEventEngine } = require('./services/notificationEventEngine.service');
const { startNotificationScheduler } = require('./services/notificationScheduler.service');
const { startAdvisorScheduler } = require('./services/advisor/advisorSweep');
const { resumePendingCampaigns } = require('./services/emailCampaign.service');

const PORT = process.env.PORT || 3001;
// Render waits 30s after SIGTERM before killing the process.
const SHUTDOWN_TIMEOUT_MS = 25_000;

let server;
let shuttingDown = false;

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received: stopping jobs and closing HTTP server`);

  const forceExit = setTimeout(() => {
    logger.error('Shutdown took too long, forcing exit');
    process.exit(exitCode || 1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    for (const task of cron.getTasks().values()) task.stop();
    if (server) await new Promise((resolve) => server.close(resolve));
    logger.info('HTTP server closed');
    await pool.end();
    logger.info('Database pool closed');
  } catch (err) {
    logger.error(`Error during shutdown: ${err.message}`);
  }
  await flushSentry();
  process.exit(exitCode);
}

// A rejected promise nobody awaited would otherwise crash the process silently
// (Node 22 default). Log it and report it; keep serving.
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error({ err }, `Unhandled promise rejection: ${err.message}`);
  captureException(err, { kind: 'unhandledRejection' });
});

// After an uncaught exception the process state is unknown: report, then restart cleanly.
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, `Uncaught exception: ${err.message}`);
  captureException(err, { kind: 'uncaughtException' });
  shutdown('uncaughtException', 1);
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

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
    startAdvisorScheduler();
    // Campanhas de email interrompidas por um reinício continuam de onde pararam.
    setTimeout(resumePendingCampaigns, 10_000);

    server = app.listen(PORT, () => {
      logger.info(`Mwanga server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error('CRITICAL: Failed to initialize database:');
    logger.error(err);
    captureException(err, { kind: 'startup' });
    await flushSentry();
    process.exit(1);
  }
}

startServer();
