const { db } = require('../config/db');
const { z } = require('zod');
const { createNotification } = require('./notification.controller');

const goalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  savedAmount: z.number().nonnegative().optional().default(0),
  deadline: z.string().optional(),
  category: z.string().optional(),
  monthlySaving: z.number().nonnegative().optional().default(0),
});

const getGoals = async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM goals WHERE household_id = ?',
    args: [req.user.householdId]
  });
  res.json(result.rows);
};

const createGoal = async (req, res, next) => {
  try {
    const data = goalSchema.parse(req.body);
    const result = await db.execute({
      sql: 'INSERT INTO goals (name, target_amount, saved_amount, deadline, category, monthly_saving, household_id) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
      args: [data.name, data.targetAmount, data.savedAmount, data.deadline, data.category, data.monthlySaving, req.user.householdId]
    });
    res.status(201).json({ id: Number(result.lastInsertRowid), ...data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const updateGoalProgress = async (req, res) => {
  const { savedAmount } = req.body;
  
  // Get current goal state for milestone logic
  const goalRes = await db.execute({
    sql: 'SELECT name, target_amount, saved_amount FROM goals WHERE id = ? AND household_id = ?',
    args: [req.params.id, req.user.householdId]
  });
  const goal = goalRes.rows[0];

  if (goal) {
    const oldPct = (goal.saved_amount / goal.target_amount) * 100;
    const newPct = (savedAmount / goal.target_amount) * 100;

    await db.execute({
      sql: 'UPDATE goals SET saved_amount = ? WHERE id = ? AND household_id = ?',
      args: [savedAmount, req.params.id, req.user.householdId]
    });

    // Notify for milestones
    if (oldPct < 50 && newPct >= 50 && newPct < 100) {
      await createNotification(req.user.householdId, 'info', `Parabéns! Chegaste à metade da tua meta: ${goal.name}! 🚀`);
    } else if (oldPct < 90 && newPct >= 90 && newPct < 100) {
      await createNotification(req.user.householdId, 'info', `Quase lá! Estás a 90% de atingir ${goal.name}! 💪`);
    } else if (oldPct < 100 && newPct >= 100) {
      await createNotification(req.user.householdId, 'success', `Meta atingida! Parabéns por completares: ${goal.name}! 🎉`);
    }
  }

  res.json({ success: true });
};

const deleteGoal = async (req, res) => {
  await db.execute({
    sql: 'DELETE FROM goals WHERE id = ? AND household_id = ?',
    args: [req.params.id, req.user.householdId]
  });
  res.json({ success: true });
};

module.exports = { getGoals, createGoal, updateGoalProgress, deleteGoal };
