/**
 * Mwanga Notification Scheduler.
 * Periodically triggers the engagement sweep and the intelligent decision engine.
 * @file notificationScheduler.service.js
 */

const cron = require('node-cron');
const logger = require('../utils/logger');
const { runScheduledEngagementSweep } = require('./notificationEventEngine.service');
const { processNotificationCandidates } = require('./notificationEngine.service');

const SCHEDULER_INTERVAL = process.env.NOTIFICATION_SCHEDULER_CRON || '*/5 * * * *'; // Every 5 minutes

function startNotificationScheduler() {
  logger.info(`Notification scheduler started with pattern: ${SCHEDULER_INTERVAL}`);

  // 1. Every 5 minutes: Generate new candidates from system status
  cron.schedule(SCHEDULER_INTERVAL, async () => {
    try {
      logger.info('[Scheduler] Running engagement sweep...');
      await runScheduledEngagementSweep();
    } catch (error) {
      logger.error(`[Scheduler] Engagement sweep failed: ${error.message}`);
    }
  });

  // 2. Every 5 minutes (offset by 1 min to avoid DB locks): Run the Decision Engine
  // This processes BOTH the candidates from step 1 AND real-time events.
  cron.schedule('1-59/5 * * * *', async () => {
    try {
      logger.info('[Scheduler] Running intelligent notification engine...');
      await processNotificationCandidates();
    } catch (error) {
      logger.error(`[Scheduler] Intelligent engine loop failed: ${error.message}`);
    }
  });
}

module.exports = {
  startNotificationScheduler,
};
