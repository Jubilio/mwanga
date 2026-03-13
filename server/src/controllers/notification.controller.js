const { db } = require('../config/db');

const getNotifications = async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM notifications WHERE household_id = ? ORDER BY created_at DESC LIMIT 50',
    args: [req.user.householdId]
  });
  res.json(result.rows);
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

// Helper for other controllers to create notifications
const createNotification = async (householdId, type, message) => {
  try {
    await db.execute({
      sql: 'INSERT INTO notifications (household_id, type, message) VALUES (?, ?, ?)',
      args: [householdId, type, message]
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

module.exports = { getNotifications, markAsRead, clearAll, createNotification };
