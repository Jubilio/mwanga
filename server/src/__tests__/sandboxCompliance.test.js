process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
jest.mock('../config/db', () => ({ db: { execute: jest.fn(), withTransaction: jest.fn() } }));
jest.mock('../utils/redis', () => null);
const { db } = require('../config/db');
const { buildDeletionPlan, addChildSteps, whereFor, runPlan, deleteAccount } = require('../services/accountDeletion.service');
const { hasUnlimitedSms, assertSmsQuota, isSmsNote } = require('../services/smsQuota.service');

beforeEach(() => { jest.clearAllMocks(); db.execute.mockReset(); });

describe('account deletion plan', () => {
  const refs = [
    { table_name: 'transactions', column_name: 'household_id', ref_table: null, on_delete: null },
    { table_name: 'kyc_documents', column_name: 'user_id', ref_table: null, on_delete: null },
    { table_name: 'secure_files', column_name: 'user_id', ref_table: null, on_delete: null },
    { table_name: 'financial_messages', column_name: 'tenant_id', ref_table: null, on_delete: null },
    { table_name: 'passkeys', column_name: 'user_id', ref_table: 'users', on_delete: 'c' },
    { table_name: 'email_campaigns', column_name: 'created_by', ref_table: 'users', on_delete: 'n' },
    { table_name: 'household_invites', column_name: 'created_by', ref_table: 'users', on_delete: 'a' },
    { table_name: 'users', column_name: 'household_id', ref_table: 'households', on_delete: 'a' },
  ];

  test('deletes household data only when nobody else is in the household', () => {
    const alone = buildDeletionPlan(refs, { userId: 7, householdId: 3, deleteHousehold: true });
    expect(alone).toEqual(expect.arrayContaining([
      { table: 'transactions', column: 'household_id', value: 3 },
      { table: 'financial_messages', column: 'tenant_id', value: 3 },
      { table: 'kyc_documents', column: 'user_id', value: 7 },
      { table: 'secure_files', column: 'user_id', value: 7 },
      { table: 'household_invites', column: 'created_by', value: 7 },
    ]));

    const shared = buildDeletionPlan(refs, { userId: 7, householdId: 3, deleteHousehold: false });
    expect(shared.some((step) => step.value === 3)).toBe(false);
    expect(shared.some((step) => step.table === 'kyc_documents')).toBe(true);
  });

  test('leaves cascade / set-null keys and the users table to PostgreSQL', () => {
    const plan = buildDeletionPlan(refs, { userId: 7, householdId: 3, deleteHousehold: true });
    const tables = plan.map((step) => step.table);
    expect(tables).not.toContain('passkeys');
    expect(tables).not.toContain('email_campaigns');
    expect(tables).not.toContain('users');
  });

  test('also removes child rows such as loan payments', () => {
    const plan = [{ table: 'loans', column: 'household_id', value: 3 }];
    const fks = [{ child_table: 'loan_payments', child_column: 'loan_id', parent_table: 'loans', parent_column: 'id', on_delete: 'a' }];
    const full = addChildSteps(plan, fks);
    expect(full).toHaveLength(2);
    expect(whereFor(full[1])).toEqual({
      sql: '"loan_id" IN (SELECT "id" FROM public."loans" WHERE "household_id" = ?)',
      args: [3],
    });
  });

  test('retries a delete that was blocked by a foreign key', async () => {
    const calls = [];
    let blockedOnce = false;
    const tx = { execute: jest.fn(async ({ sql }) => {
      calls.push(sql);
      if (sql.includes('"loans"') && sql.startsWith('DELETE') && !blockedOnce) {
        blockedOnce = true;
        const error = new Error('fk'); error.code = '23503'; throw error;
      }
      return { rows: [] };
    }) };
    await runPlan(tx, [{ table: 'loans', column: 'household_id', value: 3 }, { table: 'goals', column: 'household_id', value: 3 }]);
    expect(calls.filter((sql) => sql.startsWith('DELETE FROM public."loans"'))).toHaveLength(2);
    expect(calls).toContain('ROLLBACK TO SAVEPOINT account_delete_step');
  });

  test('deletes the user and an empty household inside one transaction', async () => {
    const executed = [];
    db.withTransaction.mockImplementation(async (work) => work({ execute: async ({ sql, args }) => {
      executed.push({ sql, args });
      if (sql.startsWith('SELECT id, household_id')) return { rows: [{ id: 7, household_id: 3 }] };
      if (sql.includes('COUNT(*)')) return { rows: [{ count: 0 }] };
      if (sql.includes('information_schema')) return { rows: [{ table_name: 'goals', column_name: 'household_id' }] };
      return { rows: [] };
    } }));
    const result = await deleteAccount(7);
    expect(result).toEqual({ householdDeleted: true, tables: 1 });
    expect(executed.some(({ sql }) => sql === 'DELETE FROM users WHERE id = ?')).toBe(true);
    expect(executed.some(({ sql, args }) => sql === 'DELETE FROM households WHERE id = ?' && args[0] === 3)).toBe(true);
  });
});

describe('SMS quota on the server', () => {
  const now = new Date('2026-11-15T10:00:00Z');

  test('recognises SMS notes like the app does', () => {
    expect(isSmsNote('Banco: M-Pesa | SMS: Confirmado...')).toBe(true);
    expect(isSmsNote('SMS_REF:abc')).toBe(true);
    expect(isSmsNote('Pago o SMS do mês')).toBe(false);
  });

  test('paid plans and active trials are unlimited', () => {
    expect(hasUnlimitedSms({ subscription_tier: 'pro' }, now)).toBe(true);
    expect(hasUnlimitedSms({ subscription_tier: 'pro', subscription_expires_at: '2026-10-01' }, now)).toBe(false);
    expect(hasUnlimitedSms({ trial_ends_at: '2026-11-20' }, now)).toBe(true);
    expect(hasUnlimitedSms({}, now)).toBe(false);
  });

  test('blocks the 31st SMS of the month on the free plan', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ count: 30 }] });
    await expect(assertSmsQuota(3, now)).rejects.toThrow('SMS_LIMIT_REACHED');
    expect(db.execute.mock.calls[1][0].args).toEqual([3, '2026-11', expect.any(String)]);
  });

  test('allows it below the limit', async () => {
    db.execute.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ count: 29 }] });
    await expect(assertSmsQuota(3, now)).resolves.toBeUndefined();
  });
});
