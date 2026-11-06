// "One household cannot read or change another's data", as evidence.
// The database below answers as if every record belonged to a different
// household: the ownership check finds nothing. Each write path must then refuse
// (NOT_FOUND) and send no write to the database, or carry the caller's
// household_id inside the write itself.
jest.mock('../config/db', () => {
  const db = { execute: jest.fn(), batch: jest.fn(), withTransaction: jest.fn() };
  db.withTransaction.mockImplementation(fn => fn(db));
  return { db };
});
jest.mock('../config/redis', () => ({ redis: null }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('../utils/audit', () => ({ logAction: jest.fn() }));
jest.mock('../utils/redis', () => null);
jest.mock('../services/notificationEventEngine.service', () => ({ publishNotificationEvent: jest.fn() }));
const { db } = require('../config/db');

const MINE = 1;
const THEIRS_RECORD = 55;
const writes = () => [
  ...db.execute.mock.calls.map(([q]) => q),
  ...db.batch.mock.calls.flatMap(([qs]) => qs),
].filter(q => /^\s*(INSERT|UPDATE|DELETE)/i.test(q.sql));

beforeEach(() => {
  jest.clearAllMocks();
  db.execute.mockResolvedValue({ rows: [], rowCount: 0 });
  db.batch.mockResolvedValue([]);
});

describe('records of another household are refused before any write', () => {
  test('deleting a transaction', async () => {
    const { deleteTransaction } = require('../services/transaction.service');
    await expect(deleteTransaction(MINE, THEIRS_RECORD)).rejects.toThrow('NOT_FOUND');
    expect(writes()).toEqual([]);
  });

  test('paying a debt', async () => {
    const { addPayment } = require('../services/debt.service');
    await expect(addPayment(MINE, THEIRS_RECORD, { amount: 100, payment_date: '2026-11-06' })).rejects.toThrow('NOT_FOUND');
    expect(writes()).toEqual([]);
  });

  test('paying a xitique contribution', async () => {
    const { payContribution } = require('../services/xitique.service');
    await expect(payContribution(MINE, THEIRS_RECORD, { date: '2026-11-06' })).rejects.toThrow('NOT_FOUND');
    expect(writes()).toEqual([]);
  });

  test('receiving xitique funds', async () => {
    const { receiveFunds } = require('../services/xitique.service');
    await expect(receiveFunds(MINE, THEIRS_RECORD, { date: '2026-11-06' })).rejects.toThrow('NOT_FOUND');
    expect(writes()).toEqual([]);
  });

  test('changing an account balance', async () => {
    const { updateAccountBalance } = require('../services/account.service');
    await updateAccountBalance(MINE, THEIRS_RECORD, 999).catch(() => {});
    for (const q of writes()) {
      expect(q.sql).toMatch(/household_id\s*=\s*\?/i);
      expect(q.args).toContain(MINE);
    }
  });
});

describe('direct writes are scoped to the caller household', () => {
  const scoped = (q) => {
    expect(q.sql).toMatch(/household_id\s*=\s*(\?|\$\d)/i);
    expect(q.args).toContain(MINE);
  };

  test.each([
    ['debt.service', 'deleteDebt', [MINE, THEIRS_RECORD]],
    ['debt.service', 'updateDebt', [MINE, THEIRS_RECORD, { creditor_name: 'X', total_amount: 1 }]],
    ['account.service', 'deleteAccount', [MINE, THEIRS_RECORD]],
    ['xitique.service', 'deleteXitique', [MINE, THEIRS_RECORD]],
  ])('%s.%s', async (file, fn, args) => {
    const service = require(`../services/${file}`);
    await service[fn](...args).catch(() => {});
    const w = writes().filter(q => !/audit|activity_log/i.test(q.sql));
    expect(w.length).toBeGreaterThan(0);
    w.forEach(scoped);
  });
});

describe('Binth', () => {
  test('a tool always runs in the household of the session, whatever the model asks', async () => {
    const tools = require('../services/toolRegistry');
    db.execute.mockResolvedValue({ rows: [{ id: 11, creditor_name: 'Tio João', remaining_amount: 500, monthly_payment: 100 }] });
    // The model cannot choose the household: binthService overwrites it (see binthService.test.js).
    await tools.executeTool('proposeDebtPayment', { householdId: MINE, creditor: 'tio' });
    const selects = db.execute.mock.calls.map(([q]) => q).filter(q => /FROM debts/i.test(q.sql));
    expect(selects.length).toBeGreaterThan(0);
    selects.forEach(q => expect(q.args[0]).toBe(MINE));
  });
});
