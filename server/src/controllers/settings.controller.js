const { db } = require('../config/db');
const { logAction } = require('../utils/audit');
const { z } = require('zod');

const upsertSettingSchema = z.object({
  key: z.string().min(1).max(50).trim(),
  value: z.any(),
}).strict();

const updateHouseholdSchema = z.object({
  name: z.string().min(1).max(100).trim(),
}).strict();

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

const upsertSetting = async (req, res, next) => {
  try {
    const { key, value } = upsertSettingSchema.parse(req.body);
    const safeValue = value === null || value === undefined ? '' : value.toString();
    const householdId = req.user.householdId;

    await db.execute({
      sql: 'INSERT INTO settings (key, value, household_id) VALUES (?, ?, ?) ON CONFLICT(key, household_id) DO UPDATE SET value = ?',
      args: [key, safeValue, householdId, safeValue]
    });
    
    res.json({ success: true, key, value: safeValue });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const updateHousehold = async (req, res, next) => {
  try {
    const { name } = updateHouseholdSchema.parse(req.body);
    await db.execute({
      sql: 'UPDATE households SET name = ? WHERE id = ?',
      args: [name, req.user.householdId]
    });
    await logAction(req.user.id, 'UPDATE_HOUSEHOLD', 'HOUSEHOLD', req.user.householdId);
    res.json({ success: true, name });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

module.exports = { getSettings, upsertSetting, updateHousehold };
