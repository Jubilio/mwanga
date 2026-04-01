const { db } = require('../config/db');
const { z } = require('zod');
const { createNotification } = require('../services/notification.service');

const goalSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  targetAmount: z.number().positive(),
  savedAmount: z.number().nonnegative().optional().default(0),
  deadline: z.string().optional(),
  category: z.string().max(50).trim().optional(),
  monthlySaving: z.number().nonnegative().optional().default(0),
}).strict();

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
    res.status(201).json({ id: Number(result.rows?.[0]?.id || result.lastInsertRowid || 0), ...data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const updateGoalProgress = async (req, res) => {
  const { savedAmount, account_id, increment } = req.body;
  const householdId = req.user.householdId;
  const goalId = req.params.id;
  
  // 1. Get current goal state for validation and notifications
  const goalRes = await db.execute({
    sql: 'SELECT name, target_amount, saved_amount FROM goals WHERE id = ? AND household_id = ?',
    args: [goalId, householdId]
  });
  const goal = goalRes.rows[0];
  if (!goal) return res.status(404).json({ error: 'Meta não encontrada' });

  const numIncrement = Number(increment || 0);
  const finalSavedAmount = increment ? Number(goal.saved_amount) + numIncrement : Number(savedAmount);

  // 2. Prepare atomic updates
  const queries = [
    {
      sql: 'UPDATE goals SET saved_amount = ? WHERE id = ? AND household_id = ?',
      args: [finalSavedAmount, goalId, householdId]
    }
  ];

  // If incrementing from an account, subtract from account balance
  if (account_id && numIncrement > 0) {
    queries.push({
      sql: 'UPDATE accounts SET current_balance = current_balance - ? WHERE id = ? AND household_id = ?',
      args: [numIncrement, account_id, householdId]
    });
    
    // Optional: Log a virtual transaction for history if needed
    // For now, we focus on balance consistency.
  }

  await db.batch(queries, 'write');

  // 3. Notify for milestones (using finalSavedAmount)
  const oldPct = (Number(goal.saved_amount) / Number(goal.target_amount)) * 100;
  const newPct = (finalSavedAmount / Number(goal.target_amount)) * 100;

  if (oldPct < 50 && newPct >= 50 && newPct < 100) {
    await createNotification(householdId, 'info', `Parabéns! Chegaste à metade da tua meta: ${goal.name}! 🚀`);
  } else if (oldPct < 90 && newPct >= 90 && newPct < 100) {
    await createNotification(householdId, 'info', `Quase lá! Estás a 90% de atingir ${goal.name}! 💪`);
  } else if (oldPct < 100 && newPct >= 100) {
    await createNotification(householdId, 'success', `Meta atingida! Parabéns por completares: ${goal.name}! 🎉`);
  }

  res.json({ success: true, savedAmount: finalSavedAmount });
};

const deleteGoal = async (req, res) => {
  await db.execute({
    sql: 'DELETE FROM goals WHERE id = ? AND household_id = ?',
    args: [req.params.id, req.user.householdId]
  });
  res.json({ success: true });
};

module.exports = { getGoals, createGoal, updateGoalProgress, deleteGoal };
