const { db } = require('../config/db');
const { z } = require('zod');

const budgetSchema = z.object({
  category: z.string().min(1).max(50).trim(),
  limit: z.number().nonnegative(),
}).strict();

const getBudgets = async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM budgets WHERE household_id = ?',
    args: [req.user.householdId]
  });
  res.json(result.rows);
};

const upsertBudget = async (req, res, next) => {
  try {
    const { category, limit } = budgetSchema.parse(req.body);
    const result = await db.execute({
      sql: `
        INSERT INTO budgets (category, limit_amount, household_id)
        VALUES (?, ?, ?)
        ON CONFLICT(category, household_id) DO UPDATE SET limit_amount = EXCLUDED.limit_amount
        RETURNING id, category, limit_amount
      `,
      args: [category, limit, req.user.householdId]
    });
    const budget = result.rows?.[0];
    res.json({
      id: Number(budget?.id || 0),
      category: budget?.category || category,
      limit: Number(budget?.limit_amount || limit)
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteBudget = async (req, res) => {
  await db.execute({
    sql: 'DELETE FROM budgets WHERE id = ? AND household_id = ?',
    args: [req.params.id, req.user.householdId]
  });
  res.json({ success: true });
};

module.exports = { getBudgets, upsertBudget, deleteBudget };
