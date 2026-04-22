const { db } = require('../config/db');
const { createNotification } = require('./notification.service');

const getGoals = async (householdId) => {
  const result = await db.execute({
    sql: 'SELECT * FROM goals WHERE household_id = ?',
    args: [householdId]
  });
  return result.rows;
};

const createGoal = async (householdId, data) => {
  const result = await db.execute({
    sql: 'INSERT INTO goals (name, target_amount, saved_amount, deadline, category, monthly_saving, household_id) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
    args: [data.name, data.targetAmount, data.savedAmount, data.deadline, data.category, data.monthlySaving, householdId]
  });
  return { id: Number(result.rows?.[0]?.id || result.lastInsertRowid || 0), ...data };
};

const updateGoalProgress = async (householdId, goalId, data) => {
  const { savedAmount, account_id, increment } = data;

  const goalRes = await db.execute({
    sql: 'SELECT name, target_amount, saved_amount FROM goals WHERE id = ? AND household_id = ?',
    args: [goalId, householdId]
  });
  const goal = goalRes.rows[0];
  if (!goal) throw new Error('NOT_FOUND');

  const numIncrement = Number(increment || 0);
  const finalSavedAmount = increment ? Number(goal.saved_amount) + numIncrement : Number(savedAmount);

  const queries = [
    {
      sql: 'UPDATE goals SET saved_amount = ? WHERE id = ? AND household_id = ?',
      args: [finalSavedAmount, goalId, householdId]
    }
  ];

  if (account_id && numIncrement > 0) {
    queries.push({
      sql: 'UPDATE accounts SET current_balance = current_balance - ? WHERE id = ? AND household_id = ?',
      args: [numIncrement, account_id, householdId]
    });
    
    const today = new Date().toISOString().split('T')[0];
    queries.push({
      sql: 'INSERT INTO transactions (date, type, description, amount, category, note, household_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [today, 'poupanca', `Transferência: ${goal.name}`, numIncrement, 'Poupança', 'Reforço de meta de poupança', householdId, account_id]
    });
  }

  await db.batch(queries, 'write');

  // Milestone Notifications
  const oldPct = (Number(goal.saved_amount) / Number(goal.target_amount)) * 100;
  const newPct = (finalSavedAmount / Number(goal.target_amount)) * 100;

  if (oldPct < 50 && newPct >= 50 && newPct < 100) {
    await createNotification(householdId, 'info', `Parabéns! Chegaste à metade da tua meta: ${goal.name}! 🚀`);
  } else if (oldPct < 90 && newPct >= 90 && newPct < 100) {
    await createNotification(householdId, 'info', `Quase lá! Estás a 90% de atingir ${goal.name}! 💪`);
  } else if (oldPct < 100 && newPct >= 100) {
    await createNotification(householdId, 'success', `Meta atingida! Parabéns por completares: ${goal.name}! 🎉`);
  }

  return finalSavedAmount;
};

const deleteGoal = async (householdId, goalId) => {
  await db.execute({
    sql: 'DELETE FROM goals WHERE id = ? AND household_id = ?',
    args: [goalId, householdId]
  });
  return { success: true };
};

module.exports = {
  getGoals,
  createGoal,
  updateGoalProgress,
  deleteGoal
};
