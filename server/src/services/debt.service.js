const { db } = require('../config/db');
const { logAction } = require('../utils/audit');

const getDebts = async (householdId) => {
  const debtsResult = await db.execute({
    sql: 'SELECT * FROM debts WHERE household_id = $1 ORDER BY created_at DESC',
    args: [householdId]
  });
  
  if (debtsResult.rows.length === 0) return [];

  const debtIds = debtsResult.rows.map(d => d.id);
  const paymentsResult = await db.execute({
    sql: `SELECT * FROM debt_payments WHERE debt_id IN (${debtIds.map((_, i) => `$${i + 1}`).join(', ')}) ORDER BY payment_date DESC`,
    args: debtIds
  });

  const paymentsByDebt = paymentsResult.rows.reduce((acc, p) => {
    if (!acc[p.debt_id]) acc[p.debt_id] = [];
    acc[p.debt_id].push(p);
    return acc;
  }, {});

  return debtsResult.rows.map(debt => ({
    ...debt,
    payments: paymentsByDebt[debt.id] || []
  }));
};

const addDebt = async (householdId, data) => {
  const { creditor_name, total_amount, due_date, account_id } = data;

  const queries = [
    {
      sql: `INSERT INTO debts (creditor_name, total_amount, remaining_amount, due_date, status, household_id)
            VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING id`,
      args: [creditor_name, total_amount, total_amount, due_date || null, householdId]
    }
  ];

  if (account_id) {
    const today = new Date().toISOString().split('T')[0];
    queries.push({
      sql: `INSERT INTO transactions (date, type, description, amount, category, household_id, account_id)
            VALUES ($1, 'receita', $2, $3, 'Empréstimo', $4, $5)`,
      args: [today, `Empréstimo recebido de: ${creditor_name}`, total_amount, householdId, account_id]
    });

    queries.push({
      sql: 'UPDATE accounts SET current_balance = current_balance + $1 WHERE id = $2 AND household_id = $3',
      args: [total_amount, account_id, householdId]
    });
  }

  const results = await db.batch(queries, 'write');
  const debtId = Number(results[0].rows?.[0]?.id || results[0].lastInsertRowid || 0);

  await logAction(householdId, 'DEBT_CREATE', 'DEBT', debtId);
  return debtId;
};

const deleteDebt = async (householdId, debtId) => {
  await db.execute({
    sql: 'DELETE FROM debts WHERE id = $1 AND household_id = $2',
    args: [debtId, householdId]
  });
  await logAction(householdId, 'DEBT_DELETE', 'DEBT', debtId);
  return { success: true };
};

const addPayment = async (householdId, debtId, paymentData) => {
  const { amount, payment_date, account_id } = paymentData;
  const numAmount = Number(amount);

  const result = await db.execute({
    sql: 'SELECT * FROM debts WHERE id = $1 AND household_id = $2',
    args: [debtId, householdId]
  });
  const debt = result.rows[0];
  if (!debt) throw new Error('NOT_FOUND');

  const newRemaining = Math.max(0, Number(debt.remaining_amount) - numAmount);
  const newStatus = newRemaining === 0 ? 'paid' : 'pending';

  const queries = [
    {
      sql: 'INSERT INTO debt_payments (debt_id, amount, payment_date, household_id) VALUES ($1, $2, $3, $4) RETURNING id',
      args: [debtId, numAmount, payment_date, householdId]
    },
    {
      sql: 'UPDATE debts SET remaining_amount = $1, status = $2 WHERE id = $3',
      args: [newRemaining, newStatus, debtId]
    },
    {
      sql: `INSERT INTO transactions (date, type, description, amount, category, note, household_id, account_id)
            VALUES ($1, 'despesa', $2, $3, 'Dívida', $4, $5, $6)`,
      args: [
        payment_date,
        `Pagamento de Dívida: ${debt.creditor_name}`,
        numAmount,
        `Pagamento ${newStatus === 'paid' ? 'final' : 'parcial'} da dívida`,
        householdId,
        account_id || null
      ]
    }
  ];

  if (account_id) {
    queries.push({
      sql: 'UPDATE accounts SET current_balance = current_balance - $1 WHERE id = $2 AND household_id = $3',
      args: [numAmount, account_id, householdId]
    });
  }

  await db.batch(queries, 'write');
  await logAction(householdId, 'DEBT_PAYMENT', 'DEBT', debtId);
  
  return { success: true };
};

module.exports = {
  getDebts,
  addDebt,
  deleteDebt,
  addPayment
};
