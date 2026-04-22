const { z } = require('zod');
const logger = require('../utils/logger');
const goalService = require('../services/goal.service');
const { goalSchema, updateGoalSchema } = require('../schemas/goal.schema');

const getGoals = async (req, res) => {
  try {
    const goals = await goalService.getGoals(req.user.householdId);
    res.json(goals);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching goals');
    res.status(500).json({ error: 'Erro ao carregar metas' });
  }
};

const createGoal = async (req, res, next) => {
  try {
    const data = goalSchema.parse(req.body);
    const result = await goalService.createGoal(req.user.householdId, data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const updateGoalProgress = async (req, res, next) => {
  try {
    const data = updateGoalSchema.parse(req.body);
    const finalSavedAmount = await goalService.updateGoalProgress(req.user.householdId, req.params.id, data);
    res.json({ success: true, savedAmount: finalSavedAmount });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Meta não encontrada' });
    logger.error({ err: error }, 'Error updating goal progress');
    next(error);
  }
};

const deleteGoal = async (req, res) => {
  try {
    await goalService.deleteGoal(req.user.householdId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting goal');
    res.status(500).json({ error: 'Erro ao eliminar meta' });
  }
};

module.exports = { getGoals, createGoal, updateGoalProgress, deleteGoal };
