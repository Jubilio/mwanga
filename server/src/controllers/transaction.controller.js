const { db } = require('../config/db');
const { z } = require('zod');
const { createNotification } = require('../services/notification.service');
const { publishNotificationEvent } = require('../services/notificationEventEngine.service');
const redis = require('../utils/redis');
const { logAction } = require('../utils/audit');

const transactionSchema = z.object({
  date: z.string().min(10).max(10),
  type: z.enum(['receita', 'despesa', 'renda', 'poupanca']),
  description: z.string().max(255).trim().optional(),
  amount: z.coerce.number().positive(),
  category: z.string().max(100).trim().optional(),
  note: z.string().max(1000).trim().optional(),
  account_id: z.coerce.number().optional(),
}).strict();

const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 50, category, type, startDate, endDate } = req.query;
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, Number.parseInt(limit, 10) || 50);
    const offset = (pageNumber - 1) * limitNumber;
    const householdId = req.user?.householdId;

    if (!householdId) {
      return res.status(401).json({ error: 'Unauthorized: No household ID' });
    }

    const cacheKey = `transactions:${householdId}:${pageNumber}:${limitNumber}:${category || 'all'}:${type || 'all'}:${startDate || 'all'}:${endDate || 'all'}`;

    let cached = null;
    if (redis) {
      try {
        cached = await redis.get(cacheKey);
      } catch (redisError) {
        console.warn('Redis cache miss:', redisError.message);
      }
    }

    if (cached) {
      return res.json(typeof cached === 'string' ? JSON.parse(cached) : cached);
    }

    let sql = 'SELECT * FROM transactions WHERE household_id = ?';
    const args = [householdId];

    if (category) {
      sql += ' AND category = ?';
      args.push(category);
    }

    if (type) {
      sql += ' AND type = ?';
      args.push(type);
    }

    if (startDate) {
      sql += ' AND date >= ?';
      args.push(startDate);
    }

    if (endDate) {
      sql += ' AND date <= ?';
      args.push(endDate);
    }

    sql += ' ORDER BY date DESC LIMIT ? OFFSET ?';
    args.push(limitNumber, offset);

    const result = await db.execute({ sql, args });
    const response = result.rows;

    if (redis) {
      try {
        await redis.setex(cacheKey, 300, JSON.stringify(response));
      } catch (redisError) {
        console.warn('Redis cache set failed:', redisError.message);
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const createTransaction = async (req, res, next) => {
  try {
    const data = transactionSchema.parse(req.body);
    const householdId = req.user.householdId;

    const queries = [
      {
        sql: 'INSERT INTO transactions (date, type, description, amount, category, note, household_id, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        args: [data.date, data.type, data.description || null, data.amount, data.category || null, data.note || null, householdId, data.account_id || null],
      },
    ];

    if (data.account_id) {
      const balanceChange = (data.type === 'receita' || data.type === 'poupanca') ? data.amount : -data.amount;
      queries.push({
        sql: 'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND household_id = ?',
        args: [balanceChange, data.account_id, householdId],
      });
    }

    const results = await db.batch(queries, 'write');
    const insertResult = results[0];
    const txId = Number(insertResult.rows?.[0]?.id || insertResult.lastInsertRowid || 0);

    if (data.type === 'despesa' || data.type === 'renda') {
      const budgetCheck = await db.execute({
        sql: 'SELECT over_budget, spent_this_month, limit_amount FROM budget_vs_spending WHERE household_id = ? AND category = ?',
        args: [householdId, data.category],
      });

      if (budgetCheck.rows.length > 0) {
        const { over_budget, spent_this_month, limit_amount } = budgetCheck.rows[0];
        if (over_budget) {
          await createNotification({
            householdId,
            userId: req.user.id,
            title: `Orçamento pressionado em ${data.category}`,
            type: 'warning',
            message: `Já passaste o limite definido para ${data.category}. Limite: MT ${limit_amount} | Gasto: MT ${spent_this_month}.`,
            actionPayload: {
              type: 'budget_warning',
              route: '/quick-add',
              action: 'OPEN_DAILY_LOG',
              category: data.category,
              date: data.date,
            },
            metadata: {
              triggerType: 'legacy_budget_overrun',
            },
            dedupeKey: `legacy-budget-overrun:${req.user.id}:${data.date.slice(0, 7)}:${data.category}`,
            sendPush: true,
          });
        }
      }
    }

    if (redis) {
      try {
        await redis.del(`transactions:${householdId}:1:50:all:all:all:all`);
      } catch (redisError) {
        console.warn('Redis cache invalidation failed:', redisError.message);
      }
    }

    await logAction(householdId, 'TX_CREATE', 'TRANSACTION', txId);

    publishNotificationEvent('transaction.created', {
      userId: req.user.id,
      householdId,
      transaction: {
        id: txId,
        ...data,
      },
    });

    res.status(201).json({ id: txId, ...data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }

    next(error);
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const householdId = req.user.householdId;
    const txId = req.params.id;

    const result = await db.execute({
      sql: 'SELECT * FROM transactions WHERE id = ? AND household_id = ?',
      args: [txId, householdId],
    });
    const tx = result.rows[0];
    if (!tx) {
      return res.status(403).json({ error: 'Acesso negado ou não encontrado' });
    }

    const queries = [
      { sql: 'DELETE FROM transactions WHERE id = ?', args: [txId] },
    ];

    if (tx.account_id) {
      const originalChange = (tx.type === 'receita' || tx.type === 'poupanca') ? Number(tx.amount) : -Number(tx.amount);
      const reversal = -originalChange;
      queries.push({
        sql: 'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND household_id = ?',
        args: [reversal, tx.account_id, householdId],
      });
    }

    await db.batch(queries, 'write');

    if (redis) {
      try {
        await redis.del(`transactions:${householdId}:1:50:all:all:all:all`);
      } catch (redisError) {
        console.warn('Redis cache invalidation failed:', redisError.message);
      }
    }

    await logAction(householdId, 'TX_DELETE', 'TRANSACTION', txId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { getTransactions, createTransaction, deleteTransaction };
