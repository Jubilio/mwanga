const logger = require('../utils/logger');
const emailService = require('../services/email.service');
const campaigns = require('../services/emailCampaign.service');

const getStatus = async (req, res) => {
  try {
    const [audience, sentToday] = await Promise.all([campaigns.countAudience(), campaigns.sentInLast24h()]);
    const { dailyLimit, batchSize, batchDelayMs } = campaigns.settings();
    res.json({
      configured: emailService.isConfigured(),
      from: emailService.fromAddress() || null,
      audience,
      sentToday,
      dailyLimit,
      batchSize,
      batchDelayMs,
    });
  } catch (error) {
    logger.error(`Error loading email status: ${error.message}`);
    res.status(500).json({ error: 'Falha ao carregar o estado do email.' });
  }
};

const sendTest = async (req, res) => {
  const content = campaigns.validateContent(req.body || {});
  if (content.error) return res.status(400).json({ error: content.error });
  if (!emailService.isConfigured()) {
    return res.status(503).json({ error: 'O envio de email não está configurado no servidor (variáveis EMAIL_* no Render).' });
  }
  try {
    const to = await campaigns.sendTest({ ...content, adminId: req.user.id });
    res.json({ message: `Email de teste enviado para ${to}.`, to });
  } catch (error) {
    logger.error(`Test email failed: ${error.message}`);
    res.status(502).json({ error: `Não foi possível enviar o teste: ${error.message}` });
  }
};

const createCampaign = async (req, res) => {
  const content = campaigns.validateContent(req.body || {});
  if (content.error) return res.status(400).json({ error: content.error });
  if (!emailService.isConfigured()) {
    return res.status(503).json({ error: 'O envio de email não está configurado no servidor (variáveis EMAIL_* no Render).' });
  }
  try {
    if (await campaigns.activeCampaign()) {
      return res.status(409).json({ error: 'Já há uma campanha a ser enviada. Espere que termine ou cancele-a.' });
    }
    const campaign = await campaigns.createCampaign({ ...content, adminId: req.user.id });
    res.status(201).json(campaign);
  } catch (error) {
    logger.error(`Error creating email campaign: ${error.message}`);
    res.status(500).json({ error: 'Falha ao criar a campanha.' });
  }
};

const listCampaigns = async (req, res) => {
  try {
    res.json(await campaigns.listCampaigns());
  } catch (error) {
    logger.error(`Error listing email campaigns: ${error.message}`);
    res.status(500).json({ error: 'Falha ao carregar campanhas.' });
  }
};

const cancelCampaign = async (req, res) => {
  try {
    const cancelled = await campaigns.cancelCampaign(req.params.id);
    if (!cancelled) return res.status(404).json({ error: 'Campanha não encontrada ou já terminada.' });
    res.json({ message: 'Campanha cancelada.' });
  } catch (error) {
    logger.error(`Error cancelling email campaign: ${error.message}`);
    res.status(500).json({ error: 'Falha ao cancelar a campanha.' });
  }
};

module.exports = { getStatus, sendTest, createCampaign, listCampaigns, cancelCampaign };
