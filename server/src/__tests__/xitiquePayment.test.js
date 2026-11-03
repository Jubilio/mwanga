const { db } = require('../config/db');
const { createNotification } = require('../services/notification.service');

jest.mock('../config/db', () => ({ db: { execute: jest.fn(), batch: jest.fn(), withTransaction: jest.fn() } }));
jest.mock('../services/notification.service', () => ({ createNotification: jest.fn() }));
jest.mock('../utils/audit', () => ({ logAction: jest.fn() }));

const xitiqueService = require('../services/xitique.service');
const debtService = require('../services/debt.service');

// Runs the transaction body against a fake contribution row.
function fakeTransaction(contribution) {
  const calls = [];
  db.withTransaction.mockImplementation(async (work) => work({
    execute: async ({ sql, args }) => {
      calls.push(sql.trim().split(/\s+/).slice(0, 3).join(' '));
      if (sql.includes('FROM xitique_contributions')) return { rows: contribution ? [contribution] : [], rowCount: contribution ? 1 : 0 };
      if (sql.startsWith('UPDATE xitique_contributions')) {
        if (!contribution || contribution.paid) return { rows: [], rowCount: 0 };
        contribution.paid = 1;
        return { rows: [{ id: contribution.id }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    },
  }));
  return calls;
}

beforeEach(() => jest.clearAllMocks());

describe('xitique contribution payment', () => {
  it('records the expense once, even when called twice', async () => {
    const contribution = { id: 9, amount: 500, paid: 0, xitique_name: 'Família' };
    const calls = fakeTransaction(contribution);

    const first = await xitiqueService.payContribution(1, 9, { date: '2026-11-03', account_id: 4 });
    const second = await xitiqueService.payContribution(1, 9, { date: '2026-11-03', account_id: 4 });

    expect(first).toEqual({ success: true, alreadyPaid: false });
    expect(second).toEqual({ success: true, alreadyPaid: true });
    expect(calls.filter(c => c.startsWith('INSERT INTO transactions'))).toHaveLength(1);
    expect(calls.filter(c => c.startsWith('UPDATE accounts'))).toHaveLength(1);
    expect(createNotification).toHaveBeenCalledTimes(1);
  });

  it('refuses a contribution from another household', async () => {
    fakeTransaction(null);
    await expect(xitiqueService.payContribution(1, 9, { date: '2026-11-03' })).rejects.toThrow('NOT_FOUND');
  });
});

describe('debt payment', () => {
  it('refuses to pay a debt that is already settled', async () => {
    db.execute.mockResolvedValueOnce({ rows: [{ id: 3, remaining_amount: 0, status: 'paid', creditor_name: 'Banco' }] });
    await expect(debtService.addPayment(1, 3, { amount: 100, payment_date: '2026-11-03' })).rejects.toThrow('ALREADY_PAID');
    expect(db.batch).not.toHaveBeenCalled();
  });
});
