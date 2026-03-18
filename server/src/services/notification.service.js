const { db } = require('../config/db');

const createNotification = async (householdId, type, message) => {
  try {
    await db.execute({
      sql: 'INSERT INTO notifications (household_id, type, message) VALUES (?, ?, ?) RETURNING id',
      args: [householdId, type, message]
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
};

module.exports = { createNotification };
