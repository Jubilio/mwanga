const accountService = require('../services/account.service');
const { db } = require('../config/db');
const { logAction } = require('../utils/audit');
const redis = require('../utils/redis');

// Mock dependencies
jest.mock('../config/db', () => ({
  db: {
    execute: jest.fn()
  }
}));

jest.mock('../utils/audit', () => ({
  logAction: jest.fn()
}));

jest.mock('../utils/redis', () => ({
  del: jest.fn()
}));

describe('Account Service', () => {
  const MOCK_HOUSEHOLD_ID = 1;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccounts', () => {
    it('should return accounts for a specific household', async () => {
      const mockAccounts = [{ id: 1, name: 'BIM', type: 'bank', household_id: MOCK_HOUSEHOLD_ID }];
      db.execute.mockResolvedValueOnce({ rows: mockAccounts });

      const result = await accountService.getAccounts(MOCK_HOUSEHOLD_ID);

      expect(db.execute).toHaveBeenCalledWith({
        sql: expect.stringContaining('SELECT * FROM accounts WHERE household_id = ?'),
        args: [MOCK_HOUSEHOLD_ID]
      });
      expect(result).toEqual(mockAccounts);
    });
  });

  describe('addAccount', () => {
    it('should create an account and log action', async () => {
      const data = { name: 'M-Pesa', type: 'mobile', initial_balance: 0 };
      db.execute.mockResolvedValueOnce({ rows: [{ id: 5 }] });

      const result = await accountService.addAccount(MOCK_HOUSEHOLD_ID, data);

      expect(db.execute).toHaveBeenCalledTimes(1);
      expect(logAction).toHaveBeenCalledWith(MOCK_HOUSEHOLD_ID, 'ACCOUNT_CREATE', 'ACCOUNT', 5);
      expect(result).toBe(5);
    });

    it('should create an initial balance transaction and clear redis if initial_balance > 0', async () => {
      const data = { name: 'Cash', type: 'cash', initial_balance: 1000 };
      db.execute
        .mockResolvedValueOnce({ rows: [{ id: 6 }] }) // INSERT account
        .mockResolvedValueOnce({}); // INSERT transaction

      const result = await accountService.addAccount(MOCK_HOUSEHOLD_ID, data);

      expect(db.execute).toHaveBeenCalledTimes(2);
      const today = new Date().toISOString().split('T')[0];
      expect(db.execute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining('INSERT INTO transactions'),
        args: [today, 'Saldo inicial: Cash', 1000, MOCK_HOUSEHOLD_ID, 6]
      });
      expect(redis.del).toHaveBeenCalledWith(`transactions:${MOCK_HOUSEHOLD_ID}:1:50:all:all:all:all`);
      expect(redis.del).toHaveBeenCalledWith(`dashboard:${MOCK_HOUSEHOLD_ID}`);
      expect(result).toBe(6);
    });
  });

  describe('updateAccountBalance', () => {
    it('should create an adjustment transaction if balance changes', async () => {
      const MOCK_ACCOUNT_ID = 2;
      // Mock finding the old account
      db.execute
        .mockResolvedValueOnce({ rows: [{ current_balance: 500, name: 'BIM' }] }) // SELECT
        .mockResolvedValueOnce({}) // INSERT transaction
        .mockResolvedValueOnce({}); // UPDATE account

      await accountService.updateAccountBalance(MOCK_HOUSEHOLD_ID, MOCK_ACCOUNT_ID, 700);

      expect(db.execute).toHaveBeenCalledTimes(3);
      // Diff is 200 (positive -> receita)
      const today = new Date().toISOString().split('T')[0];
      expect(db.execute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining('INSERT INTO transactions'),
        args: [today, 'receita', 'Ajuste de saldo: BIM', 200, MOCK_HOUSEHOLD_ID, MOCK_ACCOUNT_ID]
      });
      expect(redis.del).toHaveBeenCalled();
      expect(logAction).toHaveBeenCalledWith(MOCK_HOUSEHOLD_ID, 'ACCOUNT_BALANCE_UPDATE', 'ACCOUNT', MOCK_ACCOUNT_ID);
    });

    it('should create a despesa adjustment transaction if balance decreases', async () => {
      const MOCK_ACCOUNT_ID = 3;
      db.execute
        .mockResolvedValueOnce({ rows: [{ current_balance: 500, name: 'BCI' }] }) // SELECT
        .mockResolvedValueOnce({}) // INSERT transaction
        .mockResolvedValueOnce({}); // UPDATE account

      await accountService.updateAccountBalance(MOCK_HOUSEHOLD_ID, MOCK_ACCOUNT_ID, 200);

      // Diff is -300 (negative -> despesa)
      const today = new Date().toISOString().split('T')[0];
      expect(db.execute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining('INSERT INTO transactions'),
        args: [today, 'despesa', 'Ajuste de saldo: BCI', 300, MOCK_HOUSEHOLD_ID, MOCK_ACCOUNT_ID]
      });
    });

    it('should only update balance if there is no difference', async () => {
      const MOCK_ACCOUNT_ID = 4;
      db.execute
        .mockResolvedValueOnce({ rows: [{ current_balance: 500, name: 'BIM' }] }) // SELECT
        .mockResolvedValueOnce({}); // UPDATE account (no transaction insert)

      await accountService.updateAccountBalance(MOCK_HOUSEHOLD_ID, MOCK_ACCOUNT_ID, 500);

      expect(db.execute).toHaveBeenCalledTimes(2);
      expect(redis.del).not.toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    it('should delete the account and log the action', async () => {
      const MOCK_ACCOUNT_ID = 10;
      db.execute.mockResolvedValueOnce({});

      const result = await accountService.deleteAccount(MOCK_HOUSEHOLD_ID, MOCK_ACCOUNT_ID);

      expect(db.execute).toHaveBeenCalledWith({
        sql: 'DELETE FROM accounts WHERE id = ? AND household_id = ?',
        args: [MOCK_ACCOUNT_ID, MOCK_HOUSEHOLD_ID]
      });
      expect(logAction).toHaveBeenCalledWith(MOCK_HOUSEHOLD_ID, 'ACCOUNT_DELETE', 'ACCOUNT', MOCK_ACCOUNT_ID);
      expect(result).toEqual({ success: true });
    });
  });
});
