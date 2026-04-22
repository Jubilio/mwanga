const { z } = require('zod');
const budgetService = require('../services/budget.service');
const { budgetSchema } = require('../schemas/budget.schema');
const logger = require('../utils/logger');

const getBudgets = async (req, res) => {
  try {
    const budgets = await budgetService.getBudgets(req.user.householdId);
    res.json(budgets);
  } catch (error) {
    logger.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Erro ao buscar orçamentos' });
  }
};

const upsertBudget = async (req, res, next) => {
  try {
    const data = budgetSchema.parse(req.body);
    const result = await budgetService.upsertBudget(req.user.householdId, data);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteBudget = async (req, res) => {
  try {
    await budgetService.deleteBudget(req.user.householdId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting budget:', error);
    res.status(500).json({ error: 'Erro ao eliminar orçamento' });
  }
};

module.exports = { getBudgets, upsertBudget, deleteBudget };
