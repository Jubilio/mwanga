const { z } = require('zod');
const xitiqueService = require('../services/xitique.service');
const { xitiqueSchema, xitiquePaymentSchema } = require('../schemas/xitique.schema');

const getXitiques = async (req, res) => {
  try {
    const fullList = await xitiqueService.getXitiques(req.user.householdId);
    res.json(fullList);
  } catch (error) {
    console.error('Error fetching xitiques:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const createXitique = async (req, res, next) => {
  try {
    const data = xitiqueSchema.parse(req.body);
    const result = await xitiqueService.createXitique(req.user.householdId, data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    if (error.message === 'POSITION_OUT_OF_BOUNDS') return res.status(400).json({ error: 'Sua posição não pode ser maior que o total de participantes' });
    next(error);
  }
};

const deleteXitique = async (req, res) => {
  try {
    await xitiqueService.deleteXitique(req.user.householdId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover xitique' });
  }
};

const payContribution = async (req, res, next) => {
  try {
    const data = xitiquePaymentSchema.parse(req.body);
    await xitiqueService.payContribution(req.user.householdId, req.params.contributionId, data);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    if (error.message === 'NOT_FOUND') return res.status(403).json({ error: 'Acesso negado ou contribuição não encontrada' });
    next(error);
  }
};

const receiveFunds = async (req, res, next) => {
  try {
    const data = xitiquePaymentSchema.parse(req.body);
    await xitiqueService.receiveFunds(req.user.householdId, req.params.receiptId, data);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    if (error.message === 'NOT_FOUND') return res.status(403).json({ error: 'Acesso negado ou recebimento não encontrado' });
    next(error);
  }
};

module.exports = { getXitiques, createXitique, deleteXitique, payContribution, receiveFunds };
