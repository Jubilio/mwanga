const { db } = require('../config/db');
const { ensureReminderNotifications } = require('../services/reminder.service');
const { createNotification } = require('../services/notification.service');
const logger = require('../utils/logger');

const getNotifications = async (req, res) => {
  try {
    try {
      await ensureReminderNotifications(req.user.householdId);
    } catch (error) {
      logger.warn(`Reminder generation skipped: ${error.message}`);
    }

    const result = await db.execute({
      sql: 'SELECT * FROM notifications WHERE household_id = ? ORDER BY created_at DESC LIMIT 50',
      args: [req.user.householdId]
    });
    res.json(result.rows);
  } catch (error) {
    logger.error(`Notifications fetch failed: ${error.message}`);
    res.status(200).json([]);
  }
};

const markAsRead = async (req, res) => {
  await db.execute({
    sql: 'UPDATE notifications SET read = 1 WHERE id = ? AND household_id = ?',
    args: [req.params.id, req.user.householdId]
  });
  res.json({ success: true });
};

const clearAll = async (req, res) => {
  await db.execute({
    sql: 'DELETE FROM notifications WHERE household_id = ?',
    args: [req.user.householdId]
  });
  res.json({ success: true });
};

module.exports = { getNotifications, markAsRead, clearAll, createNotification };
