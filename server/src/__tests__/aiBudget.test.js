jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('../services/email.service', () => ({ send: jest.fn().mockResolvedValue({}) }));
const { db } = require('../config/db');
const email = require('../services/email.service');
const budget = require('../services/aiBudget');

// Routes db.execute by SQL so the order of queries does not matter.
function fakeDb({ spent, alreadySent = false }) {
  db.execute.mockImplementation(async ({ sql }) => {
    if (/SUM\(cost_usd\)/.test(sql)) return { rows: [{ total: String(spent) }] };
    if (/INSERT INTO ai_budget_alerts/.test(sql)) return { rows: alreadySent ? [] : [{ month: 'x' }] };
    if (/FROM users WHERE role = 'admin'/.test(sql)) return { rows: [{ email: 'admin@example.com' }] };
    return { rows: [] };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  budget.resetBudgetCache();
  process.env.AI_MONTHLY_BUDGET_USD = '20';
  delete process.env.AI_BUDGET_ALERT_RATIO;
});
afterAll(() => { delete process.env.AI_MONTHLY_BUDGET_USD; });

test('no budget configured means no ceiling and no query', async () => {
  delete process.env.AI_MONTHLY_BUDGET_USD;
  db.execute.mockResolvedValue({ rows: [] });
  await expect(budget.isOverBudget()).resolves.toBe(false);
  expect(db.execute).not.toHaveBeenCalled();
});

test('below the alert ratio: allowed, no email', async () => {
  fakeDb({ spent: 5 });
  await expect(budget.isOverBudget()).resolves.toBe(false);
  expect(email.send).not.toHaveBeenCalled();
});

test('at 80 %: allowed, admins get one warning', async () => {
  fakeDb({ spent: 17 });
  await expect(budget.isOverBudget()).resolves.toBe(false);
  expect(email.send).toHaveBeenCalledTimes(1);
  expect(email.send.mock.calls[0][0]).toMatchObject({ to: 'admin@example.com' });
  expect(email.send.mock.calls[0][0].subject).toMatch(/80%/);
});

test('at the ceiling: Mwanga keys blocked and admins told', async () => {
  fakeDb({ spent: 20.5 });
  await expect(budget.isOverBudget()).resolves.toBe(true);
  expect(email.send.mock.calls[0][0].subject).toMatch(/esgotado/);
});

test('an alert already sent this month is not sent again', async () => {
  fakeDb({ spent: 25, alreadySent: true });
  await expect(budget.isOverBudget()).resolves.toBe(true);
  expect(email.send).not.toHaveBeenCalled();
});

test('the spend is cached for five minutes', async () => {
  fakeDb({ spent: 1 });
  await budget.budgetState(1000);
  await budget.budgetState(1000 + 60 * 1000);
  expect(db.execute.mock.calls.filter(([q]) => /SUM\(cost_usd\)/.test(q.sql))).toHaveLength(1);
});

test('when the spend cannot be read, Mwanga keys stay on', async () => {
  db.execute.mockRejectedValue(new Error('db down'));
  await expect(budget.isOverBudget()).resolves.toBe(false);
});
