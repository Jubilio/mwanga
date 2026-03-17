const { db } = require('../config/db');
const { z } = require('zod');
const { createNotification } = require('./notification.controller');

const transactionSchema = z.object({
  date: z.string().min(10).max(10), // Expecting YYYY-MM-DD
  type: z.enum(['receita', 'despesa', 'renda', 'poupanca']),
  description: z.string().max(255).trim().optional(),
  amount: z.coerce.number().positive(),
  category: z.string().max(100).trim().optional(),
  note: z.string().max(1000).trim().optional(),
  account_id: z.coerce.number().optional(),
}).strict();

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
    const txId = Number(insertResult.lastInsertRowid);
    
    // --- Budget Alert Logic ---
    if (data.type === 'despesa' || data.type === 'renda') {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      
      // Check if this category is now over budget
      const budgetRes = await db.execute({
        sql: `
          SELECT b.limit_amount, COALESCE(SUM(t.amount), 0) as spent
          FROM budgets b
          LEFT JOIN transactions t ON t.category = b.category 
            AND t.household_id = b.household_id 
            AND t.type IN ('despesa', 'renda') AND t.date >= ?
          WHERE b.household_id = ? AND b.category = ?
          GROUP BY b.limit_amount
        `,
        args: [monthStart, req.user.householdId, data.category]
      });

      if (budgetRes.rows.length > 0) {
        const { limit_amount, spent } = budgetRes.rows[0];
        if (spent > limit_amount) {
          await createNotification(
            req.user.householdId, 
            'warning', 
            `Alerta: Estás fora do orçamento em ${data.category}! Limite: MT ${limit_amount} | Gasto: MT ${spent}`
          );
        }
      }
    }
    
    res.status(201).json({ id: txId, ...data });
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
