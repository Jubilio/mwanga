const { db } = require('../config/db');
const logger = require('../utils/logger');
const { z } = require('zod');
const { logAction } = require('../utils/audit');

const ACCOUNT_TYPE_ALIASES = {
  cash: 'dinheiro',
  bank: 'banco',
  mobile: 'outro',
  mobile_money: 'outro',
  'm-pesa': 'mpesa',
  mpesa: 'mpesa',
  'e-mola': 'emola',
  emola: 'emola',
  'm-kesh': 'mkesh',
  mkesh: 'mkesh',
  corrente: 'banco',
  poupanca: 'banco',
  investimento: 'outro'
};

const normalizeAccountType = (type) => ACCOUNT_TYPE_ALIASES[type] || type;
const ALLOWED_ACCOUNT_TYPES = ['dinheiro', 'mpesa', 'emola', 'mkesh', 'banco', 'outro'];

const addAccountSchema = z.object({
  name: z.coerce.string().trim().min(1).max(50),
  type: z.coerce.string()
    .trim()
    .toLowerCase()
    .transform(normalizeAccountType)
    .refine((value) => ALLOWED_ACCOUNT_TYPES.includes(value), { message: 'Tipo de conta inválido' }),
  initial_balance: z.coerce.number().finite(),
});

const updateBalanceSchema = z.object({
  current_balance: z.coerce.number(),
}).strict();

exports.getAccounts = async (req, res) => {
  try {
    const householdId = req.user.householdId;
    const result = await db.execute({
      sql: 'SELECT * FROM accounts WHERE household_id = ? ORDER BY created_at DESC',
      args: [householdId]
    });
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
};

exports.addAccount = async (req, res, next) => {
  try {
    const { name, type, initial_balance } = addAccountSchema.parse(req.body);
    const householdId = req.user.householdId;
    
    // Create account with initial balance
    const result = await db.execute({
      sql: `
        INSERT INTO accounts (name, type, initial_balance, current_balance, household_id)
        VALUES (?, ?, ?, ?, ?) RETURNING id
      `,
      args: [name, type, initial_balance, initial_balance, householdId]
    });

    const accountId = Number(result.rows[0]?.id || result.lastInsertRowid || 0);

    // If initial balance > 0, create a transaction record so it shows up in monthly income
    if (initial_balance > 0) {
      const today = new Date().toISOString().split('T')[0];
      await db.execute({
        sql: `
          INSERT INTO transactions (date, type, description, amount, category, household_id, account_id)
          VALUES (?, 'receita', ?, ?, 'Saldo Inicial', ?, ?)
        `,
        args: [today, `Saldo inicial: ${name}`, initial_balance, householdId, accountId]
      });
      
      // Invalidate transactions cache if Redis is used
      const redis = require('../utils/redis');
      if (redis) {
        try {
          await redis.del(`transactions:${householdId}:1:50:all:all:all:all`);
          await redis.del(`dashboard:${householdId}`);
        } catch (cacheErr) {
          logger.warn('Cache invalidation failed on addAccount transaction');
        }
      }
    }

    await logAction(householdId, 'ACCOUNT_CREATE', 'ACCOUNT', accountId);

    res.status(201).json({ id: accountId, message: 'Account added successfully with initial balance transaction' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues || error.errors || [] });
    }
    logger.error('Error adding account:', error);
    next(error);
  }
};

exports.updateAccountBalance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { current_balance } = updateBalanceSchema.parse(req.body);
    const householdId = req.user.householdId;

    // Fetch old balance to calculate difference
    const accountResult = await db.execute({
      sql: 'SELECT current_balance, name FROM accounts WHERE id = ? AND household_id = ?',
      args: [id, householdId]
    });
    const account = accountResult.rows[0];

    if (account) {
      const oldBalance = Number(account.current_balance || 0);
      const diff = current_balance - oldBalance;

      if (diff !== 0) {
        const today = new Date().toISOString().split('T')[0];
        const type = diff > 0 ? 'receita' : 'despesa';
        
        await db.execute({
          sql: `
            INSERT INTO transactions (date, type, description, amount, category, household_id, account_id)
            VALUES (?, ?, ?, ?, 'Ajuste de Saldo', ?, ?)
          `,
          args: [today, type, `Ajuste de saldo: ${account.name}`, Math.abs(diff), householdId, id]
        });

        const redis = require('../utils/redis');
        if (redis) {
          try {
            await redis.del(`transactions:${householdId}:1:50:all:all:all:all`);
            await redis.del(`dashboard:${householdId}`);
          } catch (err) {}
        }
      }
    }

    await db.execute({
      sql: `
        UPDATE accounts 
        SET current_balance = ? 
        WHERE id = ? AND household_id = ?
      `,
      args: [current_balance, id, householdId]
    });

    await logAction(householdId, 'ACCOUNT_BALANCE_UPDATE', 'ACCOUNT', id);

    res.json({ message: 'Account balance updated and adjustment recorded' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    logger.error('Error updating account balance:', error);
    next(error);
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const householdId = req.user.householdId;

    await db.execute({
      sql: 'DELETE FROM accounts WHERE id = ? AND household_id = ?',
      args: [id, householdId]
    });
    
    await logAction(householdId, 'ACCOUNT_DELETE', 'ACCOUNT', id);
    
    res.json({ message: 'Account deleted' });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
