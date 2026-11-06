jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
const { db } = require('../config/db');
const { exportUserData, buildPlan, cleanRow } = require('../services/dataExport.service');

test('household tables are read by household_id, personal tables by user_id; internal tables skipped', () => {
  expect(buildPlan([
    { table_name: 'transactions', column_name: 'household_id' },
    { table_name: 'transactions', column_name: 'user_id' },
    { table_name: 'advisor_memory', column_name: 'user_id' },
    { table_name: 'idempotency_keys', column_name: 'user_id' },
    { table_name: 'users', column_name: 'household_id' },
  ])).toEqual([{ table: 'transactions', column: 'household_id' }, { table: 'advisor_memory', column: 'user_id' }]);
});

test('secrets are never exported', () => {
  expect(cleanRow('users', { id: 1, name: 'Ana', password_hash: 'x', reset_password_code_hash: 'y', reset_password_token: 'z' })).toEqual({ id: 1, name: 'Ana' });
  expect(cleanRow('settings', { key: 'ai_credentials', value: 'enc' }).value).toBe('[not exported]');
  expect(cleanRow('settings', { key: 'currency', value: 'MZN' }).value).toBe('MZN');
  expect(cleanRow('push_subscriptions', { id: 1, endpoint: 'e', p256dh: 'k', auth: 'a' })).toEqual({ id: 1, endpoint: 'e' });
});

test('exports only the caller own rows', async () => {
  db.execute.mockImplementation(async ({ sql, args }) => {
    if (/FROM users WHERE id/.test(sql)) return { rows: [{ id: 3, household_id: 7, name: 'Ana', password_hash: 'h' }] };
    if (/FROM households WHERE id/.test(sql)) return { rows: [{ id: 7, name: 'Casa' }] };
    if (/information_schema/.test(sql)) return { rows: [{ table_name: 'transactions', column_name: 'household_id' }, { table_name: 'advisor_memory', column_name: 'user_id' }] };
    if (/"transactions"/.test(sql)) { expect(args).toEqual([7]); return { rows: [{ id: 1, amount: 150 }] }; }
    if (/"advisor_memory"/.test(sql)) { expect(args).toEqual([3]); return { rows: [] }; }
    throw new Error(`unexpected ${sql}`);
  });
  const data = await exportUserData(3);
  expect(data.user).toEqual({ id: 3, household_id: 7, name: 'Ana' });
  expect(data.tables).toEqual({ transactions: [{ id: 1, amount: 150 }] });
});
