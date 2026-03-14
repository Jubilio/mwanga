const { db } = require('../config/db');
const { z } = require('zod');

const transactionSchema = z.object({
  date: z.string(),
  type: z.enum(['receita', 'despesa', 'renda', 'poupanca']),
  description: z.string().optional(),
  amount: z.coerce.number().positive(),
  category: z.string().optional(),
  note: z.string().optional(),
  account_id: z.coerce.number().optional(),
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
    
    // Use transaction for both insert and balance update
    const queries = [
      {
        sql: 'INSERT INTO transactions (date, type, description, amount, category, note, household_id, account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
        args: [data.date, data.type, data.description, data.amount, data.category, data.note, req.user.householdId, data.account_id || null]
      }
    ];

    if (data.account_id) {
      const balanceChange = (data.type === 'receita' || data.type === 'poupanca') ? data.amount : -data.amount;
      queries.push({
        sql: 'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND household_id = ?',
        args: [balanceChange, data.account_id, req.user.householdId]
      });
    }

    const results = await db.batch(queries, 'write');
    const insertResult = results[0];
    
    res.status(201).json({ id: Number(insertResult.lastInsertRowid), ...data });
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
