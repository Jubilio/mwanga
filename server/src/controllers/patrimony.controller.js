const { db } = require('../config/db');
const { z } = require('zod');

const assetSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  value: z.number().positive(),
});

const liabilitySchema = z.object({
  name: z.string().min(1),
  totalAmount: z.number().positive(),
  remainingAmount: z.number().nonnegative(),
  interestRate: z.number().nonnegative().optional().default(0),
});

// Assets
const getAssets = async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM assets WHERE household_id = ?',
    args: [req.user.householdId]
  });
  res.json(result.rows);
};

const createAsset = async (req, res, next) => {
  try {
    const data = assetSchema.parse(req.body);
    const result = await db.execute({
      sql: 'INSERT INTO assets (name, type, value, household_id) VALUES (?, ?, ?, ?) RETURNING id',
      args: [data.name, data.type, data.value, req.user.householdId]
    });
    res.status(201).json({ id: Number(result.lastInsertRowid), ...data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteAsset = async (req, res) => {
  await db.execute({
    sql: 'DELETE FROM assets WHERE id = ? AND household_id = ?',
    args: [req.params.id, req.user.householdId]
  });
  res.json({ success: true });
};

// Liabilities
const getLiabilities = async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM liabilities WHERE household_id = ?',
    args: [req.user.householdId]
  });
  res.json(result.rows);
};

const createLiability = async (req, res, next) => {
  try {
    const data = liabilitySchema.parse(req.body);
    const result = await db.execute({
      sql: 'INSERT INTO liabilities (name, total_amount, remaining_amount, interest_rate, household_id) VALUES (?, ?, ?, ?, ?) RETURNING id',
      args: [data.name, data.totalAmount, data.remainingAmount, data.interestRate, req.user.householdId]
    });
    res.status(201).json({ id: Number(result.lastInsertRowid), ...data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteLiability = async (req, res) => {
  await db.execute({
    sql: 'DELETE FROM liabilities WHERE id = ? AND household_id = ?',
    args: [req.params.id, req.user.householdId]
  });
  res.json({ success: true });
};

module.exports = { getAssets, createAsset, deleteAsset, getLiabilities, createLiability, deleteLiability };
