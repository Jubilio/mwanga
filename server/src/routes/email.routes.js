const express = require('express');
const logger = require('../utils/logger');
const { verifyUnsubscribeToken, setOptOut } = require('../services/emailCampaign.service');

/**
 * Páginas públicas para cancelar (ou retomar) a subscrição dos emails do Mwanga.
 * O link no email abre uma página com um botão: um GET nunca altera nada, porque
 * os filtros de spam abrem os links automaticamente. O POST também serve o
 * "cancelar com um clique" dos clientes de email (RFC 8058).
 */
const router = express.Router();

function page(title, message, form = '') {
  return `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${title} · Mwanga</title></head>
<body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:440px;margin:60px auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 24px;text-align:center;">
    <div style="font-size:20px;font-weight:bold;color:#d97706;margin-bottom:16px;">Mwanga ✦</div>
    <h1 style="font-size:18px;margin:0 0 12px;">${title}</h1>
    <p style="font-size:14px;line-height:1.6;color:#4b5563;margin:0 0 20px;">${message}</p>
    ${form}
  </div>
</body></html>`;
}

function button(action, userId, token, label, primary) {
  const style = primary
    ? 'background:#d97706;color:#fff;border:none;'
    : 'background:#fff;color:#374151;border:1px solid #d1d5db;';
  return `<form method="post" action="/api/email/${action}?u=${userId}&t=${encodeURIComponent(token)}">
    <button type="submit" style="${style}padding:12px 20px;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">${label}</button>
  </form>`;
}

function readParams(req, res) {
  const userId = Number(req.query.u);
  const token = String(req.query.t || '');
  if (!Number.isInteger(userId) || userId <= 0 || !verifyUnsubscribeToken(userId, token)) {
    res.status(400).type('html').send(page('Link inválido', 'Este link não é válido. Use o link que veio no email mais recente.'));
    return null;
  }
  return { userId, token };
}

router.get('/unsubscribe', (req, res) => {
  const params = readParams(req, res);
  if (!params) return;
  res.type('html').send(page(
    'Deixar de receber emails?',
    'Vai deixar de receber as novidades e avisos do Mwanga por email. Os emails de segurança, como a recuperação de senha, continuam.',
    button('unsubscribe', params.userId, params.token, 'Sim, cancelar subscrição', true),
  ));
});

router.post('/unsubscribe', async (req, res) => {
  const params = readParams(req, res);
  if (!params) return;
  try {
    await setOptOut(params.userId, true);
    logger.info(`User ${params.userId} unsubscribed from emails`);
    res.type('html').send(page(
      'Subscrição cancelada',
      'Já não vai receber estes emails do Mwanga. Se mudar de ideias, pode voltar a subscrever.',
      button('resubscribe', params.userId, params.token, 'Voltar a subscrever', false),
    ));
  } catch (error) {
    logger.error(`Unsubscribe failed for user ${params.userId}: ${error.message}`);
    res.status(500).type('html').send(page('Algo correu mal', 'Não foi possível cancelar agora. Tente de novo daqui a pouco.'));
  }
});

router.post('/resubscribe', async (req, res) => {
  const params = readParams(req, res);
  if (!params) return;
  try {
    await setOptOut(params.userId, false);
    res.type('html').send(page('Subscrição retomada', 'Vai voltar a receber os emails do Mwanga. Obrigado!'));
  } catch (error) {
    logger.error(`Resubscribe failed for user ${params.userId}: ${error.message}`);
    res.status(500).type('html').send(page('Algo correu mal', 'Não foi possível retomar agora. Tente de novo daqui a pouco.'));
  }
});

module.exports = router;
