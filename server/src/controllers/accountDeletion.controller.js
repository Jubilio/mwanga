const { z } = require('zod');
const logger = require('../utils/logger');
const { deleteAccount } = require('../services/accountDeletion.service');

const CONFIRMATION_WORD = 'APAGAR';

const schema = z.object({
  confirmation: z.string().trim(),
}).strict();

const deleteMyAccount = async (req, res) => {
  const parsed = schema.safeParse(req.body || {});
  if (!parsed.success || parsed.data.confirmation.toUpperCase() !== CONFIRMATION_WORD) {
    return res.status(400).json({ error: `Escreva ${CONFIRMATION_WORD} para confirmar.` });
  }
  try {
    const result = await deleteAccount(req.user.id);
    return res.json({ success: true, householdDeleted: result.householdDeleted });
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Conta não encontrada.' });
    logger.error(`Falha ao apagar a conta ${req.user.id}: ${error.message}`);
    return res.status(500).json({ error: 'Não foi possível apagar a conta. Nada foi apagado. Tente de novo ou contacte o suporte.' });
  }
};

module.exports = { deleteMyAccount, CONFIRMATION_WORD };
