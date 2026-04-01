const logger = require('../utils/logger');
const { runScheduledEngagementSweep } = require('./notificationEventEngine.service');

let schedulerHandle = null;

async function runSchedulerTick(reason) {
  try {
    await runScheduledEngagementSweep(new Date());
    logger.info(`Notification scheduler tick completed (${reason}).`);
  } catch (error) {
    logger.warn(`Notification scheduler tick failed (${reason}): ${error.message}`);
  }
}

function startNotificationScheduler() {
  if (schedulerHandle || process.env.DISABLE_NOTIFICATION_SCHEDULER === 'true') {
    return;
  }

  const intervalMs = Number(process.env.NOTIFICATION_SCHEDULER_INTERVAL_MS || 15 * 60 * 1000);
  const startupDelayMs = Number(process.env.NOTIFICATION_SCHEDULER_STARTUP_DELAY_MS || 15000);

  setTimeout(() => {
    runSchedulerTick('startup');
  }, startupDelayMs);

  schedulerHandle = setInterval(() => {
    runSchedulerTick('interval');
  }, intervalMs);

  logger.info(`Notification scheduler started (interval=${intervalMs}ms).`);
}

module.exports = { startNotificationScheduler };
