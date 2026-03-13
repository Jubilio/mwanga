const { db } = require('../config/db');
const { z } = require('zod');

const budgetSchema = z.object({
  category: z.string(),
  limit: z.number().nonnegative(),
});

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
    await db.execute({
      sql: 'INSERT INTO budgets (category, limit_amount, household_id) VALUES (?, ?, ?) ON CONFLICT(category, household_id) DO UPDATE SET limit_amount = ?',
      args: [category, limit, req.user.householdId, limit]
    });
    res.json({ category, limit });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

module.exports = { getBudgets, upsertBudget };
