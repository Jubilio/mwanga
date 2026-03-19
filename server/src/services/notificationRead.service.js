const { db } = require('../config/db');
const logger = require('../utils/logger');

let readStorageKindPromise;

async function detectNotificationReadStorageKind() {
  const result = await db.execute({
    sql: `
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'notifications'
        AND column_name = 'read'
      LIMIT 1
    `,
    args: []
  });

  const column = result.rows[0];
  if (!column) {
    logger.warn('notifications.read column metadata not found; defaulting to integer compatibility.');
    return 'integer';
  }

  if (column.data_type === 'boolean' || column.udt_name === 'bool') {
    return 'boolean';
  }

  return 'integer';
}

async function getNotificationReadStorageKind() {
  if (!readStorageKindPromise) {
    readStorageKindPromise = detectNotificationReadStorageKind().catch((error) => {
      readStorageKindPromise = null;
      logger.warn(`Failed to inspect notifications.read type; defaulting to integer compatibility. ${error.message}`);
      return 'integer';
    });
  }

  return readStorageKindPromise;
}

async function getNotificationReadValue(isRead) {
  const storageKind = await getNotificationReadStorageKind();
  return storageKind === 'boolean' ? Boolean(isRead) : (isRead ? 1 : 0);
}

module.exports = {
  getNotificationReadStorageKind,
  getNotificationReadValue
};
