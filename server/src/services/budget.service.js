const { db } = require('../config/db');

const getBudgets = async (householdId) => {
  const result = await db.execute({
    sql: 'SELECT * FROM budgets WHERE household_id = ?',
    args: [householdId]
  });
  return result.rows;
};

const upsertBudget = async (householdId, data) => {
  const { category, limit } = data;
  const result = await db.execute({
    sql: `
      INSERT INTO budgets (category, limit_amount, household_id)
      VALUES (?, ?, ?)
      ON CONFLICT(category, household_id) DO UPDATE SET limit_amount = EXCLUDED.limit_amount
      RETURNING id, category, limit_amount
    `,
    args: [category, limit, householdId]
  });
  const budget = result.rows?.[0];
  
  return {
    id: Number(budget?.id || 0),
    category: budget?.category || category,
    limit: Number(budget?.limit_amount || limit)
  };
};

const deleteBudget = async (householdId, budgetId) => {
  await db.execute({
    sql: 'DELETE FROM budgets WHERE id = ? AND household_id = ?',
    args: [budgetId, householdId]
  });
  return { success: true };
};

module.exports = {
  getBudgets,
  upsertBudget,
  deleteBudget
};
