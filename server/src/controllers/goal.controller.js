const { db } = require('../config/db');
const { z } = require('zod');

const goalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  savedAmount: z.number().nonnegative().optional().default(0),
  deadline: z.string().optional(),
  category: z.string().optional(),
  monthlySaving: z.number().nonnegative().optional().default(0),
});

const getGoals = async (req, res) => {
  const data = db.prepare('SELECT * FROM goals WHERE household_id = ?').all(req.user.householdId);
  res.json(data);
};

const createGoal = async (req, res, next) => {
  try {
    const data = goalSchema.parse(req.body);
    const info = db.prepare('INSERT INTO goals (name, target_amount, saved_amount, deadline, category, monthly_saving, household_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
                  .run(data.name, data.targetAmount, data.savedAmount, data.deadline, data.category, data.monthlySaving, req.user.householdId);
    res.status(201).json({ id: info.lastInsertRowid, ...data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const updateGoalProgress = async (req, res) => {
  const { savedAmount } = req.body;
  db.prepare('UPDATE goals SET saved_amount = ? WHERE id = ? AND household_id = ?').run(savedAmount, req.params.id, req.user.householdId);
  res.json({ success: true });
};

const deleteGoal = async (req, res) => {
  db.prepare('DELETE FROM goals WHERE id = ? AND household_id = ?').run(req.params.id, req.user.householdId);
  res.json({ success: true });
};

module.exports = { getGoals, createGoal, updateGoalProgress, deleteGoal };
