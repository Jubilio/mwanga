import { describe, expect, it } from 'vitest';
import { planBalanceSyncs } from './smsBalance';

describe('planBalanceSyncs', () => {
  it('uses the newest SMS balance per account', () => {
    const plan = planBalanceSyncs([
      { accountId: 9, balance: 500, date: '2026-11-01', time: 1 },
      { accountId: 9, balance: 0.28, date: '2026-11-02', time: 2 },
      { accountId: 3, balance: null, date: '2026-11-02', time: 3 },
    ], []);
    expect(plan).toEqual([{ accountId: 9, balance: 0.28 }]);
  });

  it('skips an account that already has newer movements', () => {
    const plan = planBalanceSyncs([{ accountId: 9, balance: 10, date: '2026-11-01', time: 1 }], [{ account_id: 9, data: '2026-11-02' }]);
    expect(plan).toEqual([]);
  });
});
