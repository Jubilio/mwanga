const transactionService = require('../services/transaction.service');
const { db } = require('../config/db');
const redis = require('../utils/redis');
const { logAction } = require('../utils/audit');
const { createNotification } = require('../services/notification.service');
const { publishNotificationEvent } = require('../services/notificationEventEngine.service');

jest.mock('../config/db', () => ({
  db: {
    execute: jest.fn(),
    batch: jest.fn(),
  }
}));

jest.mock('../utils/redis', () => ({
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
}));

jest.mock('../utils/audit', () => ({
  logAction: jest.fn(),
}));

jest.mock('../services/notification.service', () => ({
  createNotification: jest.fn(),
}));

jest.mock('../services/notificationEventEngine.service', () => ({
  publishNotificationEvent: jest.fn(),
}));

describe('Transaction Service', () => {
  const MOCK_HOUSEHOLD_ID = 1;
  const MOCK_USER_ID = 42;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransactions', () => {
    it('should return cached transactions if available in Redis', async () => {
      const mockTransactions = [{ id: 1, amount: 100 }];
      redis.get.mockResolvedValueOnce(JSON.stringify(mockTransactions));

      const result = await transactionService.getTransactions(MOCK_HOUSEHOLD_ID, {});

      expect(redis.get).toHaveBeenCalledWith(`transactions:${MOCK_HOUSEHOLD_ID}:1:50:all:all:all:all`);
      expect(result).toEqual(mockTransactions);
      expect(db.execute).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache if not in Redis', async () => {
      redis.get.mockResolvedValueOnce(null);
      const mockTransactions = [{ id: 2, amount: 200 }];
      db.execute.mockResolvedValueOnce({ rows: mockTransactions });

      const result = await transactionService.getTransactions(MOCK_HOUSEHOLD_ID, { limit: 10 });

      expect(db.execute).toHaveBeenCalledWith({
        sql: expect.stringContaining('LIMIT ? OFFSET ?'),
        args: [MOCK_HOUSEHOLD_ID, 10, 0]
      });
      expect(redis.setex).toHaveBeenCalledWith(`transactions:${MOCK_HOUSEHOLD_ID}:1:10:all:all:all:all`, 300, JSON.stringify(mockTransactions));
      expect(result).toEqual(mockTransactions);
    });
  });

  describe('createTransaction', () => {
    it('should create a transaction, update account balance, and publish event', async () => {
      const data = {
        date: '2026-04-22',
        type: 'despesa',
        amount: 500,
        category: 'Food',
        account_id: 10,
      };

      db.batch.mockResolvedValueOnce([{ rows: [{ id: 99 }] }]);
      // Mock budget check
      db.execute.mockResolvedValueOnce({ rows: [{ over_budget: 0, spent_this_month: 200, limit_amount: 1000 }] });

      const result = await transactionService.createTransaction(MOCK_USER_ID, MOCK_HOUSEHOLD_ID, data);

      expect(db.batch).toHaveBeenCalledTimes(1);
      const batchQueries = db.batch.mock.calls[0][0];
      expect(batchQueries.length).toBe(2); // INSERT tx, UPDATE account
      expect(batchQueries[1].sql).toContain('UPDATE accounts');
      // For 'despesa', the change is -amount
      expect(batchQueries[1].args[0]).toBe(-500);

      expect(logAction).toHaveBeenCalledWith(MOCK_HOUSEHOLD_ID, 'TX_CREATE', 'TRANSACTION', 99);
      expect(publishNotificationEvent).toHaveBeenCalledWith('transaction.created', {
        userId: MOCK_USER_ID,
        householdId: MOCK_HOUSEHOLD_ID,
        transaction: { id: 99, ...data }
      });
      expect(redis.del).toHaveBeenCalled();
      expect(result.id).toBe(99);
    });

    it('should create a budget warning notification if over budget', async () => {
      const data = { date: '2026-04-22', type: 'despesa', amount: 600, category: 'Food' };
      
      db.batch.mockResolvedValueOnce([{ lastInsertRowid: 100 }]);
      db.execute.mockResolvedValueOnce({ rows: [{ over_budget: 1, spent_this_month: 1100, limit_amount: 1000 }] });
      createNotification.mockResolvedValueOnce({});

      await transactionService.createTransaction(MOCK_USER_ID, MOCK_HOUSEHOLD_ID, data);

      expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'warning',
        title: 'Orçamento pressionado em Food'
      }));
    });
  });

  describe('deleteTransaction', () => {
    it('should delete a transaction and reverse the account balance', async () => {
      const MOCK_TX_ID = 55;
      db.execute.mockResolvedValueOnce({
        rows: [{ id: MOCK_TX_ID, type: 'despesa', amount: 200, account_id: 10 }]
      });
      db.batch.mockResolvedValueOnce({});

      const result = await transactionService.deleteTransaction(MOCK_HOUSEHOLD_ID, MOCK_TX_ID);

      const batchQueries = db.batch.mock.calls[0][0];
      expect(batchQueries.length).toBe(2); // DELETE tx, UPDATE account
      // For 'despesa', original change was -200, so reverting means current_balance - (-200) -> +200
      expect(batchQueries[1].args).toEqual([-200, 10, MOCK_HOUSEHOLD_ID]);
      expect(logAction).toHaveBeenCalledWith(MOCK_HOUSEHOLD_ID, 'TX_DELETE', 'TRANSACTION', MOCK_TX_ID);
      expect(redis.del).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should throw NOT_FOUND if transaction does not exist', async () => {
      db.execute.mockResolvedValueOnce({ rows: [] });

      await expect(transactionService.deleteTransaction(MOCK_HOUSEHOLD_ID, 999))
        .rejects.toThrow('NOT_FOUND');
    });
  });

  describe('updateTransaction', () => {
    it('should update a transaction and recalculate account balances', async () => {
      const MOCK_TX_ID = 77;
      const oldTx = { id: MOCK_TX_ID, type: 'receita', amount: 100, account_id: 5 };
      const newData = { date: '2026-04-22', type: 'receita', amount: 150, account_id: 5 };

      db.execute.mockResolvedValueOnce({ rows: [oldTx] });
      db.batch.mockResolvedValueOnce({});

      const result = await transactionService.updateTransaction(MOCK_HOUSEHOLD_ID, MOCK_TX_ID, newData);

      const batchQueries = db.batch.mock.calls[0][0];
      expect(batchQueries.length).toBe(3); 
      // 1: Revert old balance: UPDATE accounts SET current_balance = current_balance - ? ... (args: [100])
      expect(batchQueries[0].args).toEqual([100, 5, MOCK_HOUSEHOLD_ID]);
      // 2: Update tx
      expect(batchQueries[1].sql).toContain('UPDATE transactions');
      // 3: Apply new balance: UPDATE accounts SET current_balance = current_balance + ? ... (args: [150])
      expect(batchQueries[2].args).toEqual([150, 5, MOCK_HOUSEHOLD_ID]);

      expect(result.id).toBe(MOCK_TX_ID);
      expect(redis.del).toHaveBeenCalled();
    });
  });
});
