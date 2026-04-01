const { db } = require('../config/db');
const logger = require('../utils/logger');

async function trackBehaviorEvent({
  userId = null,
  householdId,
  eventName,
  eventSource = 'system',
  eventValue = null,
  context = {},
}) {
  if (!householdId || !eventName) {
    return;
  }

  try {
    await db.execute({
      sql: `
        INSERT INTO behavior_events (
          user_id,
          household_id,
          event_name,
          event_source,
          event_value,
          context
        )
        VALUES (?, ?, ?, ?, ?, ?::jsonb)
      `,
      args: [
        userId,
        householdId,
        eventName,
        eventSource,
        eventValue,
        JSON.stringify(context || {}),
      ],
    });
  } catch (error) {
    if (!String(error.message || '').includes('behavior_events')) {
      logger.warn(`Behavior event tracking skipped: ${error.message}`);
    }
  }
}

module.exports = { trackBehaviorEvent };
