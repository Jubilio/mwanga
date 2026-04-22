const { db } = require('../config/db');
const { logAction } = require('../utils/audit');
const redis = require('../utils/redis');
const logger = require('../utils/logger');

const getAccounts = async (householdId) => {
  const result = await db.execute({
    sql: 'SELECT * FROM accounts WHERE household_id = ? ORDER BY created_at DESC',
    args: [householdId]
  });
  return result.rows;
};

const addAccount = async (householdId, data) => {
  const { name, type, initial_balance } = data;
  
  const result = await db.execute({
    sql: `INSERT INTO accounts (name, type, initial_balance, current_balance, household_id)
          VALUES (?, ?, ?, ?, ?) RETURNING id`,
    args: [name, type, initial_balance, initial_balance, householdId]
  });

  const accountId = Number(result.rows[0]?.id || result.lastInsertRowid || 0);

  if (initial_balance > 0) {
    const today = new Date().toISOString().split('T')[0];
    await db.execute({
      sql: `INSERT INTO transactions (date, type, description, amount, category, household_id, account_id)
            VALUES (?, 'receita', ?, ?, 'Saldo Inicial', ?, ?)`,
      args: [today, `Saldo inicial: ${name}`, initial_balance, householdId, accountId]
    });
    
    if (redis) {
      try {
        await redis.del(`transactions:${householdId}:1:50:all:all:all:all`);
        await redis.del(`dashboard:${householdId}`);
      } catch (err) {}
    }
  }

  await logAction(householdId, 'ACCOUNT_CREATE', 'ACCOUNT', accountId);
  return accountId;
};

const updateAccountBalance = async (householdId, accountId, newBalance) => {
  const accountResult = await db.execute({
    sql: 'SELECT current_balance, name FROM accounts WHERE id = ? AND household_id = ?',
    args: [accountId, householdId]
  });
  const account = accountResult.rows[0];

  if (account) {
    const oldBalance = Number(account.current_balance || 0);
    const diff = newBalance - oldBalance;

    if (diff !== 0) {
      const today = new Date().toISOString().split('T')[0];
      const type = diff > 0 ? 'receita' : 'despesa';
      
      await db.execute({
        sql: `INSERT INTO transactions (date, type, description, amount, category, household_id, account_id)
              VALUES (?, ?, ?, ?, 'Ajuste de Saldo', ?, ?)`,
        args: [today, type, `Ajuste de saldo: ${account.name}`, Math.abs(diff), householdId, accountId]
      });

      if (redis) {
        try {
          await redis.del(`transactions:${householdId}:1:50:all:all:all:all`);
          await redis.del(`dashboard:${householdId}`);
        } catch (err) {}
      }
    }
  }

  await db.execute({
    sql: 'UPDATE accounts SET current_balance = ? WHERE id = ? AND household_id = ?',
    args: [newBalance, accountId, householdId]
  });

  await logAction(householdId, 'ACCOUNT_BALANCE_UPDATE', 'ACCOUNT', accountId);
  return { success: true };
};

const deleteAccount = async (householdId, accountId) => {
  await db.execute({
    sql: 'DELETE FROM accounts WHERE id = ? AND household_id = ?',
    args: [accountId, householdId]
  });
  
  await logAction(householdId, 'ACCOUNT_DELETE', 'ACCOUNT', accountId);
  return { success: true };
};

module.exports = {
  getAccounts,
  addAccount,
  updateAccountBalance,
  deleteAccount
};
