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
    const result = await db.execute({
      sql: 'SELECT * FROM debts WHERE household_id = ? ORDER BY created_at DESC',
      args: [householdId]
    });

    const debts = await Promise.all(
      result.rows.map(async (debt) => {
        const paymentResult = await db.execute({
          sql: 'SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY payment_date DESC',
          args: [debt.id]
        });

        return {
          ...debt,
          payments: paymentResult.rows
        };
      })
    );

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
        VALUES (?, ?, ?, ?, 'pending', ?) RETURNING id
      `,
      args: [creditor_name, total_amount, total_amount, due_date, householdId]
    });

    res.status(201).json({
      id: Number(result.lastInsertRowid),
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
      sql: 'DELETE FROM debts WHERE id = ? AND household_id = ?',
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
      sql: 'SELECT * FROM debts WHERE id = ? AND household_id = ?',
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
        sql: 'INSERT INTO debt_payments (debt_id, amount, payment_date, household_id, account_id) VALUES (?, ?, ?, ?, ?) RETURNING id',
        args: [id, numAmount, payment_date, householdId, account_id || null]
      },
      {
        sql: 'UPDATE debts SET remaining_amount = ?, status = ? WHERE id = ?',
        args: [newRemaining, newStatus, id]
      }
    ];

    if (account_id) {
      queries.push({
        sql: 'UPDATE accounts SET current_balance = current_balance - ? WHERE id = ? AND household_id = ?',
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
