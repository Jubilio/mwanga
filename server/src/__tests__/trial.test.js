jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../utils/audit', () => ({ logAction: jest.fn() }));
jest.mock('../controllers/dashboard.controller', () => ({ invalidateDashboardCache: jest.fn() }));
const { db } = require('../config/db');
const { upsertSetting, startTrial } = require('../controllers/settings.controller');
const res = () => { const response = { status: jest.fn(), json: jest.fn() }; response.status.mockReturnValue(response); return response; };
const req = { user: { id: 7, householdId: 42 } };
const DAY_MS = 24 * 60 * 60 * 1000;
beforeEach(() => jest.clearAllMocks());

test.each([['subscription_tier', 'pro'], ['subscription_expires_at', ''], ['trial_ends_at', '2099-01-01T00:00:00.000Z']])('clients cannot write %s', async (key, value) => {
  const response = res();
  await upsertSetting({ user: { householdId: 42 }, body: { key, value } }, response, jest.fn());
  expect(response.status).toHaveBeenCalledWith(400); expect(db.execute).not.toHaveBeenCalled();
});

test('starts a 14-day trial for a free household older than 30 days', async () => {
  db.execute
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ created_at: new Date(Date.now() - 45 * DAY_MS).toISOString() }] })
    .mockResolvedValueOnce({ rows: [] });
  const response = res();
  await startTrial(req, response, jest.fn());
  const { trial_ends_at: endsAt } = response.json.mock.calls[0][0];
  expect(Math.round((new Date(endsAt) - Date.now()) / DAY_MS)).toBe(14);
  expect(db.execute).toHaveBeenLastCalledWith(expect.objectContaining({ args: ['trial_ends_at', endsAt, 42] }));
});

test('refuses accounts younger than 30 days', async () => {
  db.execute
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ created_at: new Date(Date.now() - 5 * DAY_MS).toISOString() }] });
  const response = res();
  await startTrial(req, response, jest.fn());
  expect(response.status).toHaveBeenCalledWith(403); expect(db.execute).toHaveBeenCalledTimes(2);
});

test.each([
  [[{ key: 'trial_ends_at', value: '2026-01-01T00:00:00.000Z' }]],
  [[{ key: 'subscription_tier', value: 'growth' }]],
])('refuses a second trial or a paying household', async (rows) => {
  db.execute.mockResolvedValueOnce({ rows });
  const response = res();
  await startTrial(req, response, jest.fn());
  expect(response.status).toHaveBeenCalledWith(409); expect(db.execute).toHaveBeenCalledTimes(1);
});
