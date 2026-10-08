jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../utils/audit', () => ({ logAction: jest.fn() }));
jest.mock('../controllers/dashboard.controller', () => ({ invalidateDashboardCache: jest.fn() }));
const { db } = require('../config/db');
const { upsertSetting } = require('../controllers/settings.controller');
const res = () => { const response = { status: jest.fn(), json: jest.fn() }; response.status.mockReturnValue(response); return response; };
beforeEach(() => jest.clearAllMocks());
test.each([['user_salary', -1], ['default_rent', ''], ['financial_month_start_day', 32], ['currency', 'invalid'], ['daily_entry_reminder_time', '25:99']])('rejects invalid %s before writing', async (key, value) => {
  const response = res();
  await upsertSetting({ user: { householdId: 42 }, body: { key, value } }, response, jest.fn());
  expect(response.status).toHaveBeenCalledWith(400); expect(db.execute).not.toHaveBeenCalled();
});
test('checks default account ownership and rejects another household account', async () => {
  db.execute.mockResolvedValueOnce({ rows: [] });
  const response = res();
  await upsertSetting({ user: { householdId: 42 }, body: { key: 'default_income_account_id', value: '7' } }, response, jest.fn());
  expect(db.execute).toHaveBeenCalledWith({ sql: 'SELECT id FROM accounts WHERE id = ? AND household_id = ?', args: [7, 42] });
  expect(response.status).toHaveBeenCalledWith(400); expect(db.execute).toHaveBeenCalledTimes(1);
});
test('accepts zero salary and allows clearing the default account', async () => {
  db.execute.mockResolvedValue({ rows: [] });
  for (const [key, value] of [['user_salary', 0], ['default_income_account_id', '']]) {
    const response = res(); await upsertSetting({ user: { householdId: 42 }, body: { key, value } }, response, jest.fn());
    expect(response.json).toHaveBeenCalledWith({ success: true, key, value: String(value) });
  }
});
