const { db } = require('../config/db');
const { createNotification } = require('./notification.service');
const { publishNotificationEvent } = require('./notificationEventEngine.service');
const redis = require('../utils/redis');
const { logAction } = require('../utils/audit');
const logger = require('../utils/logger');

const getTransactions = async (householdId, filters) => {
  const { page = 1, limit = 50, category, type, startDate, endDate } = filters;
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const limitNumber = Math.max(1, Number.parseInt(limit, 10) || 50);
  const offset = (pageNumber - 1) * limitNumber;

  const cacheKey = `transactions:${householdId}:${pageNumber}:${limitNumber}:${category || 'all'}:${type || 'all'}:${startDate || 'all'}:${endDate || 'all'}`;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
    } catch (err) {
      logger.warn({ err }, 'Redis cache miss/error on transactions fetch');
    }
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
  const transactions = result.rows;

  if (redis) {
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(transactions));
    } catch (err) {
      logger.warn({ err }, 'Redis cache set failed on transactions');
    }
  }

  return transactions;
};

const createTransaction = async (userId, householdId, data) => {
  const queries = [
    {
      sql: 'INSERT INTO transactions (date, type, description, amount, category, note, household_id, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      args: [data.date, data.type, data.description || null, data.amount, data.category || null, data.note || null, householdId, data.account_id || null],
    },
  ];

  if (data.account_id) {
    const balanceChange = (data.type === 'receita' || data.type === 'poupanca' || data.type === 'deposito') ? data.amount : -data.amount;
    queries.push({
      sql: 'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND household_id = ?',
      args: [balanceChange, data.account_id, householdId],
    });
  }

  // Cash Balance Reconciliation
  if (data.type === 'levantamento') {
    queries.push({ sql: 'UPDATE households SET cash_balance = cash_balance + ? WHERE id = ?', args: [data.amount, householdId] });
  } else if (data.type === 'deposito') {
    queries.push({ sql: 'UPDATE households SET cash_balance = cash_balance - ? WHERE id = ?', args: [data.amount, householdId] });
  }

  const results = await db.batch(queries, 'write');
  const txId = Number(results[0].rows?.[0]?.id || results[0].lastInsertRowid || 0);

  // Budget Checks
  if (data.type === 'despesa' || data.type === 'renda') {
    const budgetCheck = await db.execute({
      sql: 'SELECT over_budget, spent_this_month, limit_amount FROM budget_vs_spending WHERE household_id = ? AND category = ?',
      args: [householdId, data.category],
    });

    if (budgetCheck.rows.length > 0 && budgetCheck.rows[0].over_budget) {
      const { spent_this_month, limit_amount } = budgetCheck.rows[0];
      await createNotification({
        householdId,
        userId,
        title: `Orçamento pressionado em ${data.category}`,
        type: 'warning',
        message: `Já passaste o limite definido para ${data.category}. Limite: MT ${limit_amount} | Gasto: MT ${spent_this_month}.`,
        actionPayload: { type: 'budget_warning', route: '/quick-add', action: 'OPEN_DAILY_LOG', category: data.category, date: data.date },
        metadata: { triggerType: 'legacy_budget_overrun' },
        dedupeKey: `legacy-budget-overrun:${userId}:${data.date.slice(0, 7)}:${data.category}`,
        sendPush: true,
      }).catch(() => {});
    }
  }

  if (redis) {
    try {
      await redis.del(`transactions:${householdId}:1:50:all:all:all:all`);
    } catch (err) {
      logger.warn({ err }, 'Redis cache invalidation failed');
    }
  }

  await logAction(householdId, 'TX_CREATE', 'TRANSACTION', txId);
  publishNotificationEvent('transaction.created', { userId, householdId, transaction: { id: txId, ...data } });

  return { id: txId, ...data };
};

const deleteTransaction = async (householdId, txId) => {
  const result = await db.execute({
    sql: 'SELECT * FROM transactions WHERE id = ? AND household_id = ?',
    args: [txId, householdId],
  });
  const tx = result.rows[0];
  if (!tx) throw new Error('NOT_FOUND');

  const queries = [{ sql: 'DELETE FROM transactions WHERE id = ?', args: [txId] }];

  if (tx.account_id) {
    const originalChange = (tx.type === 'receita' || tx.type === 'poupanca' || tx.type === 'deposito') ? Number(tx.amount) : -Number(tx.amount);
    queries.push({
      sql: 'UPDATE accounts SET current_balance = current_balance - ? WHERE id = ? AND household_id = ?',
      args: [originalChange, tx.account_id, householdId],
    });
  }

  if (tx.type === 'levantamento') {
    queries.push({ sql: 'UPDATE households SET cash_balance = cash_balance - ? WHERE id = ?', args: [tx.amount, householdId] });
  } else if (tx.type === 'deposito') {
    queries.push({ sql: 'UPDATE households SET cash_balance = cash_balance + ? WHERE id = ?', args: [tx.amount, householdId] });
  }

  await db.batch(queries, 'write');

  if (redis) {
    try {
      await redis.del(`transactions:${householdId}:1:50:all:all:all:all`);
    } catch (err) {
      logger.warn({ err }, 'Redis cache invalidation failed');
    }
  }

  await logAction(householdId, 'TX_DELETE', 'TRANSACTION', txId);
  return { success: true };
};

const updateTransaction = async (householdId, txId, data) => {
  const result = await db.execute({
    sql: 'SELECT * FROM transactions WHERE id = ? AND household_id = ?',
    args: [txId, householdId],
  });
  const oldTx = result.rows[0];
  if (!oldTx) throw new Error('NOT_FOUND');

  const queries = [];

  // Revert old account balance
  if (oldTx.account_id) {
    const oldChange = (oldTx.type === 'receita' || oldTx.type === 'poupanca' || oldTx.type === 'deposito') ? Number(oldTx.amount) : -Number(oldTx.amount);
    queries.push({
      sql: 'UPDATE accounts SET current_balance = current_balance - ? WHERE id = ? AND household_id = ?',
      args: [oldChange, oldTx.account_id, householdId],
    });
  }

  // Update transaction
  queries.push({
    sql: `UPDATE transactions SET date = ?, type = ?, description = ?, amount = ?, category = ?, note = ?, account_id = ? WHERE id = ? AND household_id = ?`,
    args: [data.date, data.type, data.description || null, data.amount, data.category || null, data.note || null, data.account_id || null, txId, householdId],
  });

  // Apply new account balance
  if (data.account_id) {
    const newChange = (data.type === 'receita' || data.type === 'poupanca' || data.type === 'deposito') ? data.amount : -data.amount;
    queries.push({
      sql: 'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND household_id = ?',
      args: [newChange, data.account_id, householdId],
    });
  }

  await db.batch(queries, 'write');

  if (redis) {
    try {
      await redis.del(`transactions:${householdId}:1:50:all:all:all:all`);
    } catch (err) {
      logger.warn({ err }, 'Redis cache invalidation failed');
    }
  }

  return { id: txId, ...data };
};

module.exports = {
  getTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction
};
