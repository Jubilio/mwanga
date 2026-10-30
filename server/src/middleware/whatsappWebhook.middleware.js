const crypto = require('crypto');
const logger = require('../utils/logger');

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length > 0 && left.length === right.length && crypto.timingSafeEqual(left, right);
};

// Twilio assina o URL completo seguido dos parâmetros POST ordenados por nome.
const twilioSignature = (authToken, url, rawBody) => {
  const params = new URLSearchParams(rawBody || '');
  const payload = [...params.keys()].sort().reduce((acc, key) => acc + key + params.get(key), url);
  return crypto.createHmac('sha1', authToken).update(Buffer.from(payload, 'utf8')).digest('base64');
};

/**
 * Rejeita webhooks que não vêm do provedor configurado. Sem isto qualquer pessoa
 * podia fingir ser o número de um utilizador e falar com a Binth em nome dele.
 *
 * - evolution: segredo partilhado WHATSAPP_WEBHOOK_SECRET, enviado no cabeçalho
 *   x-webhook-secret ou em ?token= no URL do webhook.
 * - twilio: assinatura X-Twilio-Signature com TWILIO_AUTH_TOKEN.
 *
 * Sem segredo configurado, o webhook fica fechado.
 */
const verifyWhatsAppWebhook = (req, res, next) => {
  const provider = process.env.WHATSAPP_PROVIDER || 'evolution';

  if (provider === 'twilio') {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      logger.error('[WhatsApp Webhook] TWILIO_AUTH_TOKEN em falta; webhook recusado.');
      return res.status(503).json({ error: 'Webhook não configurado.' });
    }
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    if (safeEqual(req.get('x-twilio-signature'), twilioSignature(authToken, url, req.rawBody))) return next();
  } else {
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (!secret) {
      logger.error('[WhatsApp Webhook] WHATSAPP_WEBHOOK_SECRET em falta; webhook recusado.');
      return res.status(503).json({ error: 'Webhook não configurado.' });
    }
    if (safeEqual(req.get('x-webhook-secret'), secret) || safeEqual(req.query.token, secret)) return next();
  }

  logger.warn(`[WhatsApp Webhook] Pedido com assinatura inválida de ${req.ip}`);
  return res.status(401).json({ error: 'Assinatura inválida.' });
};

module.exports = { verifyWhatsAppWebhook, twilioSignature };
