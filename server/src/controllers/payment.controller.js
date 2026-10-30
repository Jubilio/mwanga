const { z } = require('zod');
const payments = require('../services/payment.service');
const logger = require('../utils/logger');

const checkoutSchema = z.object({
  plan: z.enum(['growth', 'pro']),
  cycle: z.enum(['monthly', 'annual']).default('monthly'),
}).strict();

const ERRORS = {
  PAYMENTS_UNAVAILABLE: [503, 'Pagamentos indisponíveis de momento.'],
  PAYMENT_PROVIDER_ERROR: [502, 'Não foi possível contactar o serviço de pagamentos. Tente novamente.'],
  INVALID_PLAN: [400, 'Plano inválido.'],
};

function sendError(res, next, error) {
  const known = ERRORS[error.message];
  if (known) return res.status(known[0]).json({ error: known[1], code: error.message });
  return next(error);
}

const checkout = async (req, res, next) => {
  const parsed = checkoutSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
  try {
    const result = await payments.createCheckout({
      userId: req.user.id,
      householdId: req.user.householdId,
      plan: parsed.data.plan,
      cycle: parsed.data.cycle,
    });
    res.status(201).json(result);
  } catch (error) {
    sendError(res, next, error);
  }
};

const status = async (req, res, next) => {
  if (!/^[A-Za-z0-9]{1,50}$/.test(req.params.reference)) return res.status(400).json({ error: 'Referência inválida.' });
  try {
    const result = await payments.getStatus(req.params.reference, req.user.householdId);
    if (!result) return res.status(404).json({ error: 'Pagamento não encontrado.' });
    res.json(result);
  } catch (error) {
    sendError(res, next, error);
  }
};

// Recebe o corpo cru (express.raw) para validar a assinatura HMAC sobre os bytes exatos.
const webhook = async (req, res) => {
  if (!payments.verifySignature(req.body, req.get('X-Signature'))) {
    logger.warn('PaySuite webhook rejected: invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  try {
    await payments.handleWebhook(event);
    res.json({ received: true });
  } catch (error) {
    // 500 faz a PaySuite repetir o envio (até 5 tentativas).
    logger.error({ err: error.message, event: event?.event }, 'PaySuite webhook processing failed');
    res.status(500).json({ error: 'Processing failed' });
  }
};

module.exports = { checkout, status, webhook, checkoutSchema };
