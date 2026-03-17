const { db } = require('../config/db');
const logger = require('../utils/logger');
const { z } = require('zod');

const addAccountSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  type: z.enum(['corrente', 'poupanca', 'investimento', 'outro']),
  initial_balance: z.coerce.number(),
}).strict();

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
    
    // We set current_balance equal to initial_balance on creation
    const result = await db.execute({
      sql: `
        INSERT INTO accounts (name, type, initial_balance, current_balance, household_id)
        VALUES (?, ?, ?, ?, ?) RETURNING id
      `,
      args: [name, type, initial_balance, initial_balance, householdId]
    });
    
    res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Account added successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    logger.error('Error adding account:', error);
    next(error);
  }
};

exports.updateAccountBalance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { current_balance } = updateBalanceSchema.parse(req.body);
    const householdId = req.user.householdId;

    await db.execute({
      sql: `
        UPDATE accounts 
        SET current_balance = ? 
        WHERE id = ? AND household_id = ?
      `,
      args: [current_balance, id, householdId]
    });

    res.json({ message: 'Account balance updated' });
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
    res.json({ message: 'Account deleted' });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
