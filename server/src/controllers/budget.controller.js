const { db } = require('../config/db');
const { z } = require('zod');

const budgetSchema = z.object({
  category: z.string(),
  limit: z.number().nonnegative(),
});

const getBudgets = async (req, res) => {
  const data = db.prepare('SELECT * FROM budgets WHERE household_id = ?').all(req.user.householdId);
  res.json(data);
};

const upsertBudget = async (req, res, next) => {
  try {
    const { category, limit } = budgetSchema.parse(req.body);
    db.prepare('INSERT INTO budgets (category, limit_amount, household_id) VALUES (?, ?, ?) ON CONFLICT(category, household_id) DO UPDATE SET limit_amount = ?')
      .run(category, limit, req.user.householdId, limit);
    res.json({ category, limit });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

module.exports = { getBudgets, upsertBudget };
