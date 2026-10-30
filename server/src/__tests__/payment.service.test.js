jest.mock('../config/db', () => ({ db: { execute: jest.fn(), withTransaction: jest.fn() } }));
jest.mock('../controllers/dashboard.controller', () => ({ invalidateDashboardCache: jest.fn() }));
const crypto = require('crypto');
const { db } = require('../config/db');
const service = require('../services/payment.service');
const { checkoutSchema } = require('../controllers/payment.controller');

const SECRET = 'whsec_test';
const sign = (body) => crypto.createHmac('sha256', SECRET).update(body).digest('hex');

beforeEach(() => {
  jest.clearAllMocks();
  process.env.PAYSUITE_API_TOKEN = 'tok_test';
  process.env.PAYSUITE_WEBHOOK_SECRET = SECRET;
  process.env.FRONTEND_URL = 'https://app.test';
});
afterEach(() => { delete global.fetch; delete process.env.PAYSUITE_API_TOKEN; delete process.env.PAYSUITE_WEBHOOK_SECRET; });

test('verifies HMAC-SHA256 signatures over the raw body and rejects tampering', () => {
  const body = Buffer.from(JSON.stringify({ event: 'payment.success', data: { id: 'p1', reference: 'R1' } }));
  expect(service.verifySignature(body, sign(body))).toBe(true);
  expect(service.verifySignature(Buffer.from(body.toString().replace('R1', 'R2')), sign(body))).toBe(false);
  expect(service.verifySignature(body, undefined)).toBe(false);
  expect(service.verifySignature(body, 'short')).toBe(false);
  delete process.env.PAYSUITE_WEBHOOK_SECRET;
  expect(service.verifySignature(body, sign(body))).toBe(false);
});

test('references satisfy PaySuite format', () => {
  const ref = service.newReference(12345);
  expect(ref).toMatch(/^[A-Za-z0-9]{1,50}$/);
  expect(service.newReference(1)).not.toBe(service.newReference(1));
});

test('price is decided server-side and client cannot inject amount', () => {
  expect(service.priceFor('pro', 'monthly')).toBe(999);
  expect(service.priceFor('growth', 'annual')).toBe(3840);
  expect(() => service.priceFor('legacy', 'monthly')).toThrow('INVALID_PLAN');
  expect(checkoutSchema.safeParse({ plan: 'pro', cycle: 'monthly', amount: 1 }).success).toBe(false);
  expect(checkoutSchema.safeParse({ plan: 'legacy' }).success).toBe(false);
});

test('checkout fails closed without credentials', async () => {
  delete process.env.PAYSUITE_API_TOKEN;
  await expect(service.createCheckout({ userId: 1, householdId: 2, plan: 'pro', cycle: 'monthly' })).rejects.toThrow('PAYMENTS_UNAVAILABLE');
  expect(db.execute).not.toHaveBeenCalled();
});

test('checkout records the payment and returns the PaySuite checkout url', async () => {
  db.execute.mockResolvedValue({ rows: [] });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'success', data: { id: 'ps_1', checkout_url: 'https://paysuite.tech/checkout/ps_1' } }) });
  const result = await service.createCheckout({ userId: 1, householdId: 2, plan: 'pro', cycle: 'monthly' });
  expect(result.checkout_url).toBe('https://paysuite.tech/checkout/ps_1');
  const [url, opts] = fetch.mock.calls[0];
  expect(url).toBe('https://paysuite.tech/api/v1/payments');
  expect(opts.headers.Authorization).toBe('Bearer tok_test');
  const sent = JSON.parse(opts.body);
  expect(sent.amount).toBe(999);
  expect(sent.return_url).toBe(`https://app.test/settings?payment=return&ref=${result.reference}`);
  expect(db.execute.mock.calls[0][0].args).toEqual([2, 1, result.reference, 'pro', 'monthly', 999]);
});

function mockTransaction(settingsRows, updatedRow) {
  const tx = { execute: jest.fn() };
  tx.execute
    .mockResolvedValueOnce({ rows: updatedRow ? [updatedRow] : [] })
    .mockResolvedValueOnce({ rows: settingsRows })
    .mockResolvedValue({ rows: [] });
  db.withTransaction.mockImplementation((work) => work(tx));
  return tx;
}

test('activation sets tier and expiry, and is idempotent', async () => {
  const paidAt = new Date('2026-11-01T00:00:00Z');
  const tx = mockTransaction([], { household_id: 2, plan: 'pro', billing_cycle: 'monthly' });
  expect(await service.activate('R1', paidAt)).toBe(2);
  const writes = tx.execute.mock.calls.slice(2).map((c) => c[0].args);
  expect(writes).toEqual([['subscription_tier', 'pro', 2], ['subscription_expires_at', '2026-12-01T00:00:00.000Z', 2]]);

  const again = mockTransaction([], null);
  expect(await service.activate('R1', paidAt)).toBe(false);
  expect(again.execute).toHaveBeenCalledTimes(1);
});

test('renewing the same plan extends from the current expiry', async () => {
  const tx = mockTransaction(
    [{ key: 'subscription_tier', value: 'pro' }, { key: 'subscription_expires_at', value: '2026-11-20T00:00:00.000Z' }],
    { household_id: 2, plan: 'pro', billing_cycle: 'monthly' },
  );
  await service.activate('R2', new Date('2026-11-10T00:00:00Z'));
  expect(tx.execute.mock.calls[3][0].args).toEqual(['subscription_expires_at', '2026-12-20T00:00:00.000Z', 2]);
});

test('webhook success is only applied after PaySuite confirms the payment', async () => {
  const row = { id: 1, reference: 'R1', provider_payment_id: 'ps_1', amount: '999.00', status: 'pending' };
  db.execute.mockResolvedValueOnce({ rows: [row] });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { id: 'ps_1', reference: 'R1', amount: 999, status: 'pending' } }) });
  await service.handleWebhook({ event: 'payment.success', data: { id: 'ps_1', reference: 'R1', amount: 999 } });
  expect(db.withTransaction).not.toHaveBeenCalled();

  db.execute.mockResolvedValueOnce({ rows: [row] });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { id: 'ps_1', reference: 'R1', amount: 999, status: 'completed', transaction: { paid_at: '2026-11-01T00:00:00Z' } } }) });
  mockTransaction([], { household_id: 2, plan: 'pro', billing_cycle: 'monthly' });
  await service.handleWebhook({ event: 'payment.success', data: { id: 'ps_1', reference: 'R1', amount: 999 } });
  expect(db.withTransaction).toHaveBeenCalledTimes(1);
});

test('underpaid confirmations do not activate', async () => {
  db.execute.mockResolvedValueOnce({ rows: [{ id: 1, reference: 'R1', provider_payment_id: 'ps_1', amount: '999.00', status: 'pending' }] });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { reference: 'R1', amount: 10, status: 'completed' } }) });
  await service.handleWebhook({ event: 'payment.success', data: { id: 'ps_1', reference: 'R1' } });
  expect(db.withTransaction).not.toHaveBeenCalled();
});

test('status lookups are scoped to the household', async () => {
  db.execute.mockResolvedValueOnce({ rows: [] });
  expect(await service.getStatus('R1', 7)).toBeNull();
  expect(db.execute.mock.calls[0][0].args).toEqual(['R1', 7]);
});

test('expiry job downgrades only paid tiers', async () => {
  db.execute.mockResolvedValueOnce({ rows: [{ household_id: 3 }] }).mockResolvedValue({ rows: [] });
  expect(await service.downgradeExpired(new Date())).toBe(1);
  expect(db.execute.mock.calls[1][0].sql).toContain("value IN ('growth', 'pro')");
});
