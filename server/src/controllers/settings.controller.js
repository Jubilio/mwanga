const { db } = require('../config/db');
const { logAction } = require('../utils/audit');

const getSettings = async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM settings WHERE household_id = ?',
    args: [req.user.householdId]
  });
  const settings = result.rows.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
  res.json(settings);
};

const upsertSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required' });
    
    const safeValue = value === null || value === undefined ? '' : value.toString();
    const householdId = req.user.householdId;

    await db.execute({
      sql: 'INSERT INTO settings (key, value, household_id) VALUES (?, ?, ?) ON CONFLICT(key, household_id) DO UPDATE SET value = ?',
      args: [key, safeValue, householdId, safeValue]
    });
    
    res.json({ success: true, key, value: safeValue });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

const updateHousehold = async (req, res) => {
  const { name } = req.body;
  await db.execute({
    sql: 'UPDATE households SET name = ? WHERE id = ?',
    args: [name, req.user.householdId]
  });
  await logAction(req.user.id, 'UPDATE_HOUSEHOLD', 'HOUSEHOLD', req.user.householdId);
  res.json({ success: true, name });
};

module.exports = { getSettings, upsertSetting, updateHousehold };
