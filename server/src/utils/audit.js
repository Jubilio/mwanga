const { db } = require('../config/db');
const logger = require('./logger');

const logAction = (userId, action, targetType, targetId) => {
  try {
    db.prepare('INSERT INTO audit_log (user_id, action, target_type, target_id) VALUES (?, ?, ?, ?)')
      .run(userId, action, targetType, targetId);
  } catch (e) {
    logger.error(`Audit Log failed for user ${userId}:`, e.message);
  }
};

module.exports = { logAction };
