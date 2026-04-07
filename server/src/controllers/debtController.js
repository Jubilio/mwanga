const { db } = require('../config/db');
const logger = require('../utils/logger');
const { z } = require('zod');

const addDebtSchema = z.object({
  creditor_name: z.string().min(1).max(100).trim(),
  total_amount: z.coerce.number().positive(),
  due_date: z.string().optional().nullable(),
}).strict();

const addPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  payment_date: z.string(),
  account_id: z.coerce.number().optional(),
}).strict();

exports.getDebts = async (req, res) => {
  try {
    const householdId = req.user.householdId;
    
    // 1. Fetch all debts for the household
    const debtsResult = await db.execute({
      sql: 'SELECT * FROM debts WHERE household_id = $1 ORDER BY created_at DESC',
      args: [householdId]
    });
    
    if (debtsResult.rows.length === 0) {
      return res.json([]);
    }

    // 2. Fetch all payments for all these debts in a single query
    const debtIds = debtsResult.rows.map(d => d.id);
    const paymentsResult = await db.execute({
      sql: `SELECT * FROM debt_payments WHERE debt_id IN (${debtIds.map((_, i) => `$${i + 1}`).join(', ')}) ORDER BY payment_date DESC`,
      args: debtIds
    });

    // 3. Group payments by debt_id
    const paymentsByDebt = paymentsResult.rows.reduce((acc, p) => {
      if (!acc[p.debt_id]) acc[p.debt_id] = [];
      acc[p.debt_id].push(p);
      return acc;
    }, {});

    // 4. Assemble final data
    const debts = debtsResult.rows.map(debt => ({
      ...debt,
      payments: paymentsByDebt[debt.id] || []
    }));

    res.json(debts);
  } catch (error) {
    logger.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
};

exports.addDebt = async (req, res, next) => {
  try {
    const { creditor_name, total_amount, due_date } = addDebtSchema.parse(req.body);
    const householdId = req.user.householdId;

    const result = await db.execute({
      sql: `
        INSERT INTO debts (creditor_name, total_amount, remaining_amount, due_date, status, household_id)
        VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING id
      `,
      args: [creditor_name, total_amount, total_amount, due_date || null, householdId]
    });

    res.status(201).json({
      id: result.rows?.[0]?.id,
      message: 'Dívida adicionada com sucesso'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }

    logger.error('Error adding debt:', error);
    next(error);
  }
};

exports.deleteDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const householdId = req.user.householdId;

    await db.execute({
      sql: 'DELETE FROM debts WHERE id = $1 AND household_id = $2',
      args: [id, householdId]
    });

    res.json({ message: 'Dívida eliminada' });
  } catch (error) {
    logger.error('Error deleting debt:', error);
    res.status(500).json({ error: 'Failed to delete debt' });
  }
};

exports.addPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, payment_date, account_id } = addPaymentSchema.parse(req.body);
    const householdId = req.user.householdId;

    const numAmount = Number(amount);

    const result = await db.execute({
      sql: 'SELECT * FROM debts WHERE id = $1 AND household_id = $2',
      args: [id, householdId]
    });
    const debt = result.rows[0];

    if (!debt) {
      return res.status(404).json({ error: 'Dívida não encontrada' });
    }

    const newRemaining = Math.max(0, Number(debt.remaining_amount) - numAmount);
    const newStatus = newRemaining === 0 ? 'paid' : 'pending';

    const queries = [
      {
        sql: 'INSERT INTO debt_payments (debt_id, amount, payment_date, household_id) VALUES ($1, $2, $3, $4) RETURNING id',
        args: [id, numAmount, payment_date, householdId]
      },
      {
        sql: 'UPDATE debts SET remaining_amount = $1, status = $2 WHERE id = $3',
        args: [newRemaining, newStatus, id]
      },
      {
        sql: `
          INSERT INTO transactions (date, type, description, amount, category, note, household_id, account_id)
          VALUES ($1, 'despesa', $2, $3, 'Dívida', $4, $5, $6) RETURNING id
        `,
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

    res.status(201).json({ message: 'Pagamento registado com sucesso' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }

    logger.error('Error registering debt payment:', error);
    next(error);
  }
};

