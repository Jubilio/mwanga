const { db } = require('../config/db');

const getNotifications = async (req, res) => {
  const data = db.prepare('SELECT * FROM notifications WHERE household_id = ? ORDER BY created_at DESC LIMIT 50')
                .all(req.user.householdId);
  res.json(data);
};

const markAsRead = async (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND household_id = ?')
    .run(req.params.id, req.user.householdId);
  res.json({ success: true });
};

const clearAll = async (req, res) => {
  db.prepare('DELETE FROM notifications WHERE household_id = ?').run(req.user.householdId);
  res.json({ success: true });
};

// Helper for other controllers to create notifications
const createNotification = (householdId, type, message) => {
  db.prepare('INSERT INTO notifications (household_id, type, message) VALUES (?, ?, ?)')
    .run(householdId, type, message);
};

module.exports = { getNotifications, markAsRead, clearAll, createNotification };
