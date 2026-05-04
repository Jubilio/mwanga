const { db } = require('../config/db');
const { logAction } = require('../utils/audit');
const { z } = require('zod');
const { invalidateDashboardCache } = require('./dashboard.controller');

const upsertSettingSchema = z.object({
  key: z.string().min(1).max(50).trim(),
  value: z.any(),
}).strict();

const updateHouseholdSchema = z.object({
  name: z.string().max(100).trim().optional(),
  cash_balance: z.coerce.number().optional(),
});

const getSettings = async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM settings WHERE household_id = ?',
      args: [req.user.householdId]
    });
    const settings = result.rows.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    // Include household data
    const household = await db.execute({
      sql: 'SELECT name, cash_balance FROM households WHERE id = ?',
      args: [req.user.householdId]
    });
    
    if (household.rows.length > 0) {
      settings.household_name = household.rows[0].name;
      settings.cash_balance = Number(household.rows[0].cash_balance || 0);
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
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
    
    await invalidateDashboardCache(householdId);
    
    res.json({ success: true, key, value: safeValue });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const updateHousehold = async (req, res, next) => {
  try {
    const { name, cash_balance } = updateHouseholdSchema.parse(req.body);
    
    let updates = [];
    let args = [];
    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name);
    }
    if (cash_balance !== undefined) {
      updates.push('cash_balance = ?');
      args.push(cash_balance);
    }

    if (updates.length > 0) {
      args.push(req.user.householdId);
      await db.execute({
        sql: `UPDATE households SET ${updates.join(', ')} WHERE id = ?`,
        args: args
      });
      await logAction(req.user.id, 'UPDATE_HOUSEHOLD', 'HOUSEHOLD', req.user.householdId);
      await invalidateDashboardCache(req.user.householdId);
    }
    
    res.json({ success: true, name, cash_balance });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

module.exports = { getSettings, upsertSetting, updateHousehold };
