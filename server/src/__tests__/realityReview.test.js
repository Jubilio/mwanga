jest.mock('../config/db', () => ({ db: { withTransaction: jest.fn() } }));
const { db } = require('../config/db');
const service = require('../services/realityReview.service');
const { adjustmentSchema } = require('../controllers/realityReview.controller');
const id = '35b7a533-a635-4110-9a0a-a3c0522c21f8';
const now = new Date('2026-10-08T06:42:00Z');
const payload = { requestId: id, accountId: 7, expectedBalance: 10000, balance: 6500, asOf: '2026-10-08', reason: 'Confirmed bank balance' };
const emptySnapshot = { balances: { cash: 0, accounts: [] }, commitments: { salary: null, rent: null, landlord: '', debts: [] }, plan: { goals: [], budgets: [], journey: null } };
beforeEach(() => jest.clearAllMocks());
function transaction({ account = { id: 7, name: 'Bank', current_balance: 10000 }, stored = null } = {}) {
  const execute = jest.fn(async ({ sql, args }) => {
    if (sql.includes('FROM households')) return { rows: [{ id: 42, cash_balance: 100 }] };
    if (sql.includes('FROM accounts') && sql.includes('FOR UPDATE')) return { rows: account ? [account] : [] };
    if (sql.includes('FROM settings') && args[1] === `rr_adjust_${id}`) return { rows: stored ? [{ value: JSON.stringify(stored) }] : [] };
    return { rows: [] };
  });
  db.withTransaction.mockImplementation(work => work({ execute }));
  return execute;
}
test('does not infer an absence on first use and flags a return only after the threshold', () => {
  const meta = service.readMeta(null);
  expect(service.recordVisit(meta, now).needsReview).toBe(false);
  expect(service.recordVisit({ ...meta, lastSeenAt: '2026-09-07T06:42:00Z' }, now)).toMatchObject({ needsReview: true, absenceDays: 31, startedAt: now.toISOString() });
  expect(service.recordVisit({ ...meta, lastSeenAt: '2026-10-07T06:42:00Z' }, now).needsReview).toBe(false);
});
test('preserves a deferred review while recording new activity', () => {
  const meta = { ...service.readMeta(null), needsReview: true, lastSeenAt: '2026-10-07T06:42:00Z', deferredUntil: '2026-10-15T06:42:00Z' };
  const updated = service.recordVisit(meta, now);
  expect(service.reviewStatus(updated, emptySnapshot, now).prompt).toBe(false);
  expect(updated.needsReview).toBe(true);
});
test('invalidates only confirmations whose underlying data changed', () => {
  const meta = service.readMeta(null);
  const first = service.reviewStatus(meta, emptySnapshot, now);
  meta.confirmations = Object.fromEntries(service.GROUPS.map(group => [group, { fingerprint: first.sections[group].fingerprint, confirmedAt: now.toISOString() }]));
  expect(Object.values(service.reviewStatus(meta, emptySnapshot, now).sections).every(section => section.confirmed)).toBe(true);
  const changed = service.reviewStatus(meta, { ...emptySnapshot, balances: { cash: 500, accounts: [] } }, now);
  expect(changed.sections.balances).toMatchObject({ confirmed: false, changed: true });
  expect(changed.sections.plan.confirmed).toBe(true);
});
test('requires a new confirmation after an absence even if values stayed unchanged', () => {
  const meta = service.readMeta(null), status = service.reviewStatus(meta, emptySnapshot, now);
  meta.confirmations = { balances: { fingerprint: status.sections.balances.fingerprint, confirmedAt: '2026-09-01T00:00:00Z' } };
  meta.startedAt = now.toISOString();
  expect(service.reviewStatus(meta, emptySnapshot, now).sections.balances.confirmed).toBe(false);
});
test('writes a signed reconciliation record and balance in the same transaction, without inventing movements', async () => {
  const execute = transaction();
  const result = await service.reconcile(42, 3, payload, now);
  expect(result.adjustment).toMatchObject({ previousBalance: 10000, newBalance: 6500, difference: -3500, userId: 3 });
  const queries = execute.mock.calls.map(call => call[0]);
  expect(queries.some(query => query.sql.includes('transactions'))).toBe(false);
  expect(queries.find(query => query.sql.startsWith('UPDATE accounts')).args).toEqual([6500, 7, 42]);
  const record = queries.find(query => query.sql.startsWith('INSERT INTO settings'));
  expect(JSON.parse(record.args[1]).difference).toBe(-3500);
  expect(db.withTransaction).toHaveBeenCalledTimes(1);
});
test('rejects stale balances before any update or audit write', async () => {
  const execute = transaction({ account: { id: 7, current_balance: 9999 } });
  await expect(service.reconcile(42, 3, payload, now)).rejects.toThrow('BALANCE_CHANGED');
  expect(execute.mock.calls.some(([query]) => /^(UPDATE|INSERT)/.test(query.sql))).toBe(false);
});
test('rejects a foreign or deleted account in the authenticated household', async () => {
  const execute = transaction({ account: null });
  await expect(service.reconcile(42, 3, payload, now)).rejects.toThrow('ACCOUNT_NOT_FOUND');
  expect(execute).toHaveBeenCalledWith({ sql: expect.stringContaining('id = ? AND household_id = ? FOR UPDATE'), args: [7, 42] });
});
test('a repeated request returns its original audit record and never applies the adjustment twice', async () => {
  const stored = { ...payload, newBalance: 6500, userId: 3, difference: -3500 };
  const execute = transaction({ stored });
  expect(await service.reconcile(42, 3, payload, now)).toMatchObject({ repeated: true });
  expect(execute.mock.calls.some(([query]) => /^(UPDATE|INSERT)/.test(query.sql))).toBe(false);
  await expect(service.reconcile(42, 3, { ...payload, balance: 6000 }, now)).rejects.toThrow('REQUEST_REUSED');
});
test('cash reconciliation stores a separate journal entry and uses the household row', async () => {
  const execute = transaction();
  const result = await service.reconcile(42, 3, { ...payload, accountId: null, expectedBalance: 100, balance: 40 }, now);
  expect(result.adjustment.difference).toBe(-60);
  expect(execute).toHaveBeenCalledWith({ sql: 'UPDATE households SET cash_balance = ? WHERE id = ?', args: [40, 42] });
});
test('refuses to finish an incomplete review', async () => {
  transaction();
  await expect(service.changeReview(42, 3, { action: 'finish' }, now)).rejects.toThrow('REVIEW_INCOMPLETE');
});
test.each([{ balance: Infinity }, { balance: 1.234 }, { accountId: null, balance: -1 }, { reason: '' }, { asOf: '2026-02-30' }, { userId: 999 }])('validates adjustment data %j', patch => {
  expect(() => adjustmentSchema.parse({ ...payload, ...patch })).toThrow();
});
