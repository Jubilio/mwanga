const { z } = require('zod');
const patrimonyService = require('../services/patrimony.service');
const { assetSchema, liabilitySchema } = require('../schemas/patrimony.schema');

const getAssets = async (req, res) => {
  try {
    const assets = await patrimonyService.getAssets(req.user.householdId);
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ativos' });
  }
};

const createAsset = async (req, res, next) => {
  try {
    const data = assetSchema.parse(req.body);
    const result = await patrimonyService.createAsset(req.user.householdId, data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteAsset = async (req, res) => {
  try {
    await patrimonyService.deleteAsset(req.user.householdId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover ativo' });
  }
};

const getLiabilities = async (req, res) => {
  try {
    const liabilities = await patrimonyService.getLiabilities(req.user.householdId);
    res.json(liabilities);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar passivos' });
  }
};

const createLiability = async (req, res, next) => {
  try {
    const data = liabilitySchema.parse(req.body);
    const result = await patrimonyService.createLiability(req.user.householdId, data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteLiability = async (req, res) => {
  try {
    await patrimonyService.deleteLiability(req.user.householdId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover passivo' });
  }
};

module.exports = { getAssets, createAsset, deleteAsset, getLiabilities, createLiability, deleteLiability };
