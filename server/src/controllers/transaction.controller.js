const { db } = require('../config/db');
const { z } = require('zod');

const transactionSchema = z.object({
  date: z.string(),
  type: z.enum(['receita', 'despesa']),
  description: z.string().optional(),
  amount: z.number().positive(),
  category: z.string().optional(),
  note: z.string().optional(),
});

const getTransactions = async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM transactions WHERE household_id = ? ORDER BY date DESC',
    args: [req.user.householdId]
  });
  res.json(result.rows);
};

const createTransaction = async (req, res, next) => {
  try {
    const data = transactionSchema.parse(req.body);
    const result = await db.execute({
      sql: 'INSERT INTO transactions (date, type, description, amount, category, note, household_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [data.date, data.type, data.description, data.amount, data.category, data.note, req.user.householdId]
    });
    res.status(201).json({ id: Number(result.lastInsertRowid), ...data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteTransaction = async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM transactions WHERE id = ? AND household_id = ?',
    args: [req.params.id, req.user.householdId]
  });
  const tx = result.rows[0];
  if (!tx) return res.status(403).json({ error: 'Acesso negado ou não encontrado' });
  
  await db.execute({
    sql: 'DELETE FROM transactions WHERE id = ?',
    args: [req.params.id]
  });
  res.json({ success: true });
};

module.exports = { getTransactions, createTransaction, deleteTransaction };
