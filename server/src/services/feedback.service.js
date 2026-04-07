const { db } = require('../config/db');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../../uploads/feedback');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

async function initFeedbackTable() {
  try {
    await db.execute({
      sql: `
        CREATE TABLE IF NOT EXISTS feedbacks (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          household_id INTEGER,
          message TEXT NOT NULL,
          screenshot_url TEXT,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `,
      args: []
    });
    logger.info('Feedbacks table initialized or already exists.');
  } catch (error) {
    logger.warn('Failed to initialize feedbacks table:', error.message);
  }
}

async function createFeedback({ userId, householdId, message, screenshotUrl }) {
  const result = await db.execute({
    sql: `
      INSERT INTO feedbacks (user_id, household_id, message, screenshot_url)
      VALUES (?, ?, ?, ?)
      RETURNING *
    `,
    args: [userId, householdId, message, screenshotUrl]
  });
  return result.rows[0];
}

async function listFeedbacks(limit = 50) {
  const result = await db.execute({
    sql: 'SELECT f.*, u.name as user_name FROM feedbacks f LEFT JOIN users u ON f.user_id = u.id ORDER BY created_at DESC LIMIT ?',
    args: [limit]
  });
  return result.rows;
}

module.exports = {
  initFeedbackTable,
  createFeedback,
  listFeedbacks
};
