jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../utils/audit', () => ({ logAction: jest.fn() }));
jest.mock('../controllers/dashboard.controller', () => ({ invalidateDashboardCache: jest.fn() }));
const { db } = require('../config/db');
const { upsertSetting } = require('../controllers/settings.controller');
const { parseJourneySetting } = require('../schemas/journey.schema');
const plan = { version: 1, purpose: 'Education', priority: 'education', goalId: 7, monthlyContribution: 100, completedLessons: [], closedDays: [], reviewedWeeks: [] };
const response = () => { const res = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res); return res; };
beforeEach(() => jest.clearAllMocks());
test('stores a validated journey only after checking household ownership', async () => {
  db.execute.mockResolvedValueOnce({ rows: [{ id: 7 }] }).mockResolvedValueOnce({ rows: [] });
  const res = response();
  await upsertSetting({ user: { householdId: 42 }, body: { key: 'financial_journey_v1', value: plan } }, res, jest.fn());
  expect(db.execute.mock.calls[0][0]).toEqual({ sql: 'SELECT id FROM goals WHERE id = ? AND household_id = ?', args: [7, 42] });
  expect(db.execute.mock.calls[1][0].args).toEqual(['financial_journey_v1', JSON.stringify(plan), 42, JSON.stringify(plan)]);
  expect(res.json).toHaveBeenCalledWith({ success: true, key: 'financial_journey_v1', value: JSON.stringify(plan) });
});
test('rejects a foreign or deleted goal without storing the plan', async () => {
  db.execute.mockResolvedValueOnce({ rows: [] });
  const res = response();
  await upsertSetting({ user: { householdId: 42 }, body: { key: 'financial_journey_v1', value: plan } }, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(400);
  expect(db.execute).toHaveBeenCalledTimes(1);
});
test.each([{ monthlyContribution: -1 }, { closedDays: ['2026-02-30'] }, { reviewedWeeks: ['2026-10-07'] }, { completedLessons: ['invented'] }, { unexpected: true }])('rejects malformed journey data %j', patch => {
  expect(() => parseJourneySetting({ ...plan, ...patch })).toThrow();
});
test('rejects malformed JSON before any database access', async () => {
  const res = response();
  await upsertSetting({ user: { householdId: 42 }, body: { key: 'financial_journey_v1', value: '{broken' } }, res, jest.fn());
  expect(res.status).toHaveBeenCalledWith(400);
  expect(db.execute).not.toHaveBeenCalled();
});
