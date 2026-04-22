const { z } = require('zod');
const logger = require('../utils/logger');
const debtService = require('../services/debt.service');
const { addDebtSchema, addPaymentSchema } = require('../schemas/debt.schema');

const getDebts = async (req, res) => {
  try {
    const debts = await debtService.getDebts(req.user.householdId);
    res.json(debts);
  } catch (error) {
    logger.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
};

const addDebt = async (req, res, next) => {
  try {
    const data = addDebtSchema.parse(req.body);
    const debtId = await debtService.addDebt(req.user.householdId, data);
    res.status(201).json({ id: debtId, message: 'Dívida adicionada com sucesso' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteDebt = async (req, res) => {
  try {
    await debtService.deleteDebt(req.user.householdId, req.params.id);
    res.json({ message: 'Dívida eliminada' });
  } catch (error) {
    logger.error('Error deleting debt:', error);
    res.status(500).json({ error: 'Failed to delete debt' });
  }
};

const addPayment = async (req, res, next) => {
  try {
    const data = addPaymentSchema.parse(req.body);
    await debtService.addPayment(req.user.householdId, req.params.id, data);
    res.status(201).json({ message: 'Pagamento registado com sucesso' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Dívida não encontrada' });
    next(error);
  }
};

module.exports = { getDebts, addDebt, deleteDebt, addPayment };
