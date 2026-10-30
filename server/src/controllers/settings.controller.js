const { db } = require('../config/db');
const { logAction } = require('../utils/audit');
const { z } = require('zod');
const { invalidateDashboardCache } = require('./dashboard.controller');
const { validateSetting } = require('../schemas/settings.schema');
const { parseJourneySetting } = require('../schemas/journey.schema');

const upsertSettingSchema = z.object({
  key: z.string().min(1).max(50).trim(),
  value: z.any(),
}).strict();

const updateHouseholdSchema = z.object({
  name: z.string().max(100).trim().optional(),
  cash_balance: z.coerce.number().finite().min(0).max(1e12).optional(),
});

// Plan and trial state are only changed by the server (startTrial) or an admin, never by the client.
const BILLING_KEYS = ['subscription_tier', 'subscription_expires_at', 'trial_ends_at'];
const isReservedSettingKey = (key) => key.startsWith('ai_') || key.startsWith('rr_') || BILLING_KEYS.includes(key);

const TRIAL_DAYS = 14;
const TRIAL_MIN_ACCOUNT_AGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const getSettings = async (req, res, next) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM settings WHERE household_id = ?',
      args: [req.user.householdId]
    });
    const settings = result.rows.filter(row => !row.key.startsWith('ai_') && !row.key.startsWith('rr_')).reduce((acc, curr) => {
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
    const householdId = req.user.householdId;
    if (isReservedSettingKey(key)) return res.status(400).json({ error: 'Reserved setting' });
    let safeValue;
    if (key === 'financial_journey_v1') {
      const journey = parseJourneySetting(value);
      if (journey.goalId !== null) {
        const goal = await db.execute({
          sql: 'SELECT id FROM goals WHERE id = ? AND household_id = ?',
          args: [journey.goalId, householdId]
        });
        if (!goal.rows.length) return res.status(400).json({ error: 'Invalid journey goal' });
      }
      safeValue = JSON.stringify(journey);
    } else {
      const validated = validateSetting(key, value);
      if (['default_income_account_id', 'default_expense_account_id'].includes(key) && validated !== '') {
        const account = await db.execute({ sql: 'SELECT id FROM accounts WHERE id = ? AND household_id = ?', args: [Number(validated), householdId] });
        if (!account.rows.length) return res.status(400).json({ error: 'Invalid default account' });
      }
      safeValue = validated === null || validated === undefined ? '' : validated.toString();
    }

    await db.execute({
      sql: 'INSERT INTO settings (key, value, household_id) VALUES (?, ?, ?) ON CONFLICT(key, household_id) DO UPDATE SET value = ?',
      args: [key, safeValue, householdId, safeValue]
    });
    
    await invalidateDashboardCache(householdId);
    
    res.json({ success: true, key, value: safeValue });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.issues });
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
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.issues });
    next(error);
  }
};

const startTrial = async (req, res, next) => {
  try {
    const householdId = req.user.householdId;
    const current = await db.execute({
      sql: `SELECT key, value FROM settings WHERE household_id = ? AND key IN ('subscription_tier', 'trial_ends_at')`,
      args: [householdId]
    });
    const settings = Object.fromEntries(current.rows.map(row => [row.key, row.value]));
    if (settings.subscription_tier && settings.subscription_tier !== 'free') {
      return res.status(409).json({ error: 'Household already has a paid plan' });
    }
    if (settings.trial_ends_at) return res.status(409).json({ error: 'Trial already used' });

    const user = await db.execute({ sql: 'SELECT created_at FROM users WHERE id = ?', args: [req.user.id] });
    const createdAt = new Date(user.rows[0]?.created_at);
    if (Number.isNaN(createdAt.getTime()) || Date.now() - createdAt.getTime() < TRIAL_MIN_ACCOUNT_AGE_DAYS * DAY_MS) {
      return res.status(403).json({ error: 'Trial not available yet' });
    }

    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * DAY_MS).toISOString();
    await db.execute({
      sql: 'INSERT INTO settings (key, value, household_id) VALUES (?, ?, ?) ON CONFLICT(key, household_id) DO NOTHING',
      args: ['trial_ends_at', trialEndsAt, householdId]
    });
    await logAction(req.user.id, 'START_TRIAL', 'HOUSEHOLD', householdId);
    await invalidateDashboardCache(householdId);

    res.json({ success: true, trial_ends_at: trialEndsAt });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSettings, upsertSetting, updateHousehold, startTrial };
