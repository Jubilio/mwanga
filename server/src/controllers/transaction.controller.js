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
  const ts = db.prepare('SELECT * FROM transactions WHERE household_id = ? ORDER BY date DESC').all(req.user.householdId);
  res.json(ts);
};

const createTransaction = async (req, res, next) => {
  try {
    const data = transactionSchema.parse(req.body);
    const info = db.prepare('INSERT INTO transactions (date, type, description, amount, category, note, household_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
                  .run(data.date, data.type, data.description, data.amount, data.category, data.note, req.user.householdId);
    res.status(201).json({ id: info.lastInsertRowid, ...data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteTransaction = async (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ? AND household_id = ?').get(req.params.id, req.user.householdId);
  if (!tx) return res.status(403).json({ error: 'Access denied or not found' });
  
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
};

module.exports = { getTransactions, createTransaction, deleteTransaction };
