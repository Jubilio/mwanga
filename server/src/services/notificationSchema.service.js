const { db } = require('../config/db');
const logger = require('../utils/logger');

let schemaPromise;

async function detectNotificationSchema() {
  const [notificationColumnsRes, tableRes] = await Promise.all([
    db.execute({
      sql: `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
      `,
      args: [],
    }),
    db.execute({
      sql: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('push_subscriptions', 'behavior_events')
      `,
      args: [],
    }),
  ]);

  const notificationColumns = new Set(
    (notificationColumnsRes.rows || []).map((row) => row.column_name)
  );
  const tables = new Set((tableRes.rows || []).map((row) => row.table_name));

  return {
    notificationColumns,
    hasNotificationColumn: (columnName) => notificationColumns.has(columnName),
    hasPushSubscriptionsTable: tables.has('push_subscriptions'),
    hasBehaviorEventsTable: tables.has('behavior_events'),
  };
}

async function getNotificationSchema() {
  if (!schemaPromise) {
    schemaPromise = detectNotificationSchema().catch((error) => {
      schemaPromise = null;
      logger.warn(`Failed to inspect notification schema. Falling back to legacy mode. ${error.message}`);
      return {
        notificationColumns: new Set(),
        hasNotificationColumn: () => false,
        hasPushSubscriptionsTable: false,
        hasBehaviorEventsTable: false,
      };
    });
  }

  return schemaPromise;
}

function resetNotificationSchemaCache() {
  schemaPromise = null;
}

module.exports = {
  getNotificationSchema,
  resetNotificationSchemaCache,
};
