const crypto = require('crypto');
const { db } = require('../config/db');
const logger = require('../utils/logger');

// Preços em MZN. O valor cobrado é sempre decidido aqui, nunca pelo cliente.
const PLANS = {
  growth: { monthly: 399, annual: 320 * 12 },
  pro: { monthly: 999, annual: 800 * 12 },
};
const CYCLE_DAYS = { monthly: 30, annual: 365 };
const TIER_RANK = { free: 0, growth: 1, pro: 2, legacy: 3 };

const apiUrl = () => (process.env.PAYSUITE_API_URL || 'https://paysuite.tech/api/v1').replace(/\/$/, '');

function config() {
  const token = process.env.PAYSUITE_API_TOKEN;
  const webhookSecret = process.env.PAYSUITE_WEBHOOK_SECRET;
  if (!token || !webhookSecret) throw new Error('PAYMENTS_UNAVAILABLE');
  return { token, webhookSecret };
}

function priceFor(plan, cycle) {
  const amount = PLANS[plan]?.[cycle];
  if (!amount) throw new Error('INVALID_PLAN');
  return amount;
}

// PaySuite: máx. 50 caracteres, só letras e dígitos ASCII.
function newReference(householdId) {
  return `MW${householdId}T${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
}

function verifySignature(rawBody, signature, secret = process.env.PAYSUITE_WEBHOOK_SECRET) {
  if (!secret || !signature || !Buffer.isBuffer(rawBody)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const given = String(signature).trim().toLowerCase();
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

async function paysuite(path, { method = 'GET', body } = {}) {
  const { token } = config();
  const res = await fetch(`${apiUrl()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    logger.warn({ status: res.status, path, message: json?.message }, 'PaySuite request failed');
    throw new Error('PAYMENT_PROVIDER_ERROR');
  }
  return json.data || json;
}

async function initPaymentsTable() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        household_id INTEGER NOT NULL,
        user_id INTEGER,
        reference TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL DEFAULT 'paysuite',
        provider_payment_id TEXT,
        plan TEXT NOT NULL,
        billing_cycle TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        paid_at TIMESTAMPTZ
      )
    `);
    await db.execute('CREATE INDEX IF NOT EXISTS idx_payments_household ON payments(household_id)');
  } catch (error) {
    logger.warn('Failed to initialize payments table:', error.message);
  }
}

async function createCheckout({ userId, householdId, plan, cycle }) {
  const amount = priceFor(plan, cycle);
  config();
  const reference = newReference(householdId);
  const frontend = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const body = {
    amount,
    reference,
    description: `Mwanga ${plan} (${cycle === 'annual' ? 'anual' : 'mensal'})`,
    return_url: `${frontend}/settings?payment=return&ref=${reference}`,
  };
  if (process.env.API_PUBLIC_URL) body.webhook_url = `${process.env.API_PUBLIC_URL.replace(/\/$/, '')}/api/payments/webhook`;

  await db.execute({
    sql: 'INSERT INTO payments (household_id, user_id, reference, plan, billing_cycle, amount) VALUES (?, ?, ?, ?, ?, ?)',
    args: [householdId, userId, reference, plan, cycle, amount],
  });
  const payment = await paysuite('/payments', { method: 'POST', body });
  await db.execute({ sql: 'UPDATE payments SET provider_payment_id = ? WHERE reference = ?', args: [payment.id, reference] });
  if (!payment.checkout_url) throw new Error('PAYMENT_PROVIDER_ERROR');
  return { reference, checkout_url: payment.checkout_url, amount };
}

// Aplica um pagamento confirmado. Idempotente: só o primeiro a passar de pending para paid estende o plano.
async function activate(reference, paidAt = new Date()) {
  return db.withTransaction(async (tx) => {
    const updated = await tx.execute({
      sql: `UPDATE payments SET status = 'paid', paid_at = ? WHERE reference = ? AND status <> 'paid'
            RETURNING household_id, plan, billing_cycle`,
      args: [paidAt, reference],
    });
    const payment = updated.rows[0];
    if (!payment) return false;

    const current = await tx.execute({
      sql: "SELECT key, value FROM settings WHERE household_id = ? AND key IN ('subscription_tier', 'subscription_expires_at') FOR UPDATE",
      args: [payment.household_id],
    });
    const map = Object.fromEntries(current.rows.map((r) => [r.key, r.value]));
    if (map.subscription_tier === 'legacy') return true;

    // Renovar o mesmo plano soma ao prazo atual; mudar de plano começa a contar hoje.
    const currentExpiry = map.subscription_expires_at ? new Date(map.subscription_expires_at) : null;
    const extendFrom = map.subscription_tier === payment.plan && currentExpiry > paidAt ? currentExpiry : paidAt;
    const expiresAt = new Date(extendFrom.getTime() + CYCLE_DAYS[payment.billing_cycle] * 86400000).toISOString();

    for (const [key, value] of [['subscription_tier', payment.plan], ['subscription_expires_at', expiresAt]]) {
      await tx.execute({
        sql: 'INSERT INTO settings (key, value, household_id) VALUES (?, ?, ?) ON CONFLICT (key, household_id) DO UPDATE SET value = EXCLUDED.value',
        args: [key, value, payment.household_id],
      });
    }
    logger.info({ householdId: payment.household_id, plan: payment.plan, expiresAt }, 'Subscription activated');
    return payment.household_id;
  });
}

async function invalidateCache(householdId) {
  if (typeof householdId !== 'number') return;
  const { invalidateDashboardCache } = require('../controllers/dashboard.controller');
  await invalidateDashboardCache(householdId);
}

// Nunca confiar só no corpo do webhook: confirma o estado diretamente na PaySuite.
async function confirmWithProvider(row) {
  if (!row?.provider_payment_id) return row?.status;
  const remote = await paysuite(`/payments/${encodeURIComponent(row.provider_payment_id)}`);
  const paid = ['completed', 'paid', 'success'].includes(String(remote.status || remote.transaction?.status).toLowerCase());
  if (paid && remote.reference === row.reference && Number(remote.amount) >= Number(row.amount)) {
    const paidAt = remote.transaction?.paid_at ? new Date(remote.transaction.paid_at) : new Date();
    await invalidateCache(await activate(row.reference, paidAt));
    return 'paid';
  }
  return row.status;
}

async function handleWebhook(event) {
  const data = event?.data || {};
  const lookup = await db.execute({
    sql: 'SELECT * FROM payments WHERE reference = ? OR provider_payment_id = ? LIMIT 1',
    args: [String(data.reference || ''), String(data.id || '')],
  });
  const row = lookup.rows[0];
  if (!row) {
    logger.warn({ event: event?.event, reference: data.reference }, 'Webhook for unknown payment');
    return;
  }
  if (event.event === 'payment.success') await confirmWithProvider(row);
  else if (event.event === 'payment.failed') {
    await db.execute({ sql: "UPDATE payments SET status = 'failed' WHERE id = ? AND status = 'pending'", args: [row.id] });
  }
}

async function getStatus(reference, householdId) {
  const result = await db.execute({
    sql: 'SELECT * FROM payments WHERE reference = ? AND household_id = ?',
    args: [reference, householdId],
  });
  const row = result.rows[0];
  if (!row) return null;
  const status = row.status === 'pending' ? await confirmWithProvider(row) : row.status;
  return { reference: row.reference, plan: row.plan, cycle: row.billing_cycle, amount: Number(row.amount), status };
}

// Baixa para free os agregados cujo plano pago expirou. Tiers sem data de expiração (ex.: legacy) não são tocados.
async function downgradeExpired(now = new Date()) {
  const expired = await db.execute({
    sql: `SELECT household_id FROM settings WHERE key = 'subscription_expires_at' AND value <> '' AND value::timestamptz < ?`,
    args: [now],
  });
  for (const { household_id: householdId } of expired.rows) {
    await db.execute({
      sql: "UPDATE settings SET value = 'free' WHERE household_id = ? AND key = 'subscription_tier' AND value IN ('growth', 'pro')",
      args: [householdId],
    });
    await db.execute({ sql: "UPDATE settings SET value = '' WHERE household_id = ? AND key = 'subscription_expires_at'", args: [householdId] });
    await invalidateCache(Number(householdId));
  }
  return expired.rows.length;
}

function startSubscriptionExpiryJob() {
  const cron = require('node-cron');
  cron.schedule('17 * * * *', () => {
    downgradeExpired().catch((err) => logger.error('Subscription expiry job failed:', err.message));
  });
}

module.exports = {
  PLANS, TIER_RANK, priceFor, newReference, verifySignature, initPaymentsTable, createCheckout,
  activate, handleWebhook, getStatus, downgradeExpired, startSubscriptionExpiryJob,
};
