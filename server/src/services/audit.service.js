const { db } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Centrally records sensitive user actions in the audit_log table.
 * 
 * @param {number|string} userId - ID of the user performing the action
 * @param {string} action - Description of the action (e.g., 'LOGIN', 'TX_CREATE')
 * @param {string} targetType - Type of entity affected (e.g., 'TRANSACTION', 'USER')
 * @param {number|string} targetId - ID of the affected entity
 */
const logAction = async (userId, action, targetType = null, targetId = null) => {
  try {
    if (!userId) {
      logger.warn('Audit: Attempted to log action without userId:', action);
      return;
    }

    await db.execute({
      sql: 'INSERT INTO audit_log (user_id, action, target_type, target_id) VALUES ($1, $2, $3, $4)',
      args: [userId, action, targetType, targetId]
    });
    
    logger.info(`Audit Logged: User ${userId} -> ${action} on ${targetType || 'N/A'}:${targetId || 'N/A'}`);
  } catch (error) {
    logger.error('CRITICAL: Failed to write audit log:', error);
    // In a real bank, we might want to halt the operation if auditing fails
  }
};

module.exports = { logAction };
