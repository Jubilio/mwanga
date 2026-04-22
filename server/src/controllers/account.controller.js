const { z } = require('zod');
const logger = require('../utils/logger');
const accountService = require('../services/account.service');
const { addAccountSchema, updateBalanceSchema } = require('../schemas/account.schema');

const getAccounts = async (req, res) => {
  try {
    const accounts = await accountService.getAccounts(req.user.householdId);
    res.json(accounts);
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
};

const addAccount = async (req, res, next) => {
  try {
    const data = addAccountSchema.parse(req.body);
    const accountId = await accountService.addAccount(req.user.householdId, data);
    res.status(201).json({ id: accountId, message: 'Account added successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const updateAccountBalance = async (req, res, next) => {
  try {
    const { current_balance } = updateBalanceSchema.parse(req.body);
    await accountService.updateAccountBalance(req.user.householdId, req.params.id, current_balance);
    res.json({ message: 'Account balance updated and adjustment recorded' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteAccount = async (req, res) => {
  try {
    await accountService.deleteAccount(req.user.householdId, req.params.id);
    res.json({ message: 'Account deleted' });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

module.exports = { getAccounts, addAccount, updateAccountBalance, deleteAccount };
