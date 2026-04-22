const { z } = require('zod');
const logger = require('../utils/logger');
const transactionService = require('../services/transaction.service');
const { transactionSchema } = require('../schemas/transaction.schema');

const getTransactions = async (req, res) => {
  try {
    const householdId = req.user?.householdId;
    if (!householdId) return res.status(401).json({ error: 'Unauthorized: No household ID' });

    const transactions = await transactionService.getTransactions(householdId, req.query);
    res.json(transactions);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching transactions');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const createTransaction = async (req, res, next) => {
  try {
    const data = transactionSchema.parse(req.body);
    const result = await transactionService.createTransaction(req.user.id, req.user.householdId, data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteTransaction = async (req, res) => {
  try {
    await transactionService.deleteTransaction(req.user.householdId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(403).json({ error: 'Acesso negado ou não encontrado' });
    logger.error({ err: error }, 'Error deleting transaction');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const updateTransaction = async (req, res, next) => {
  try {
    const data = transactionSchema.parse(req.body);
    const result = await transactionService.updateTransaction(req.user.householdId, req.params.id, data);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Transação não encontrada' });
    next(error);
  }
};

module.exports = { getTransactions, createTransaction, deleteTransaction, updateTransaction };
