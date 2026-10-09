const mockQuery = jest.fn();
const mockRelease = jest.fn();
jest.mock('pg', () => ({ Pool: jest.fn(() => ({ on: jest.fn(), connect: jest.fn(async () => ({ query: mockQuery, release: mockRelease })) })) }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));
const { db } = require('../config/db');
beforeEach(() => { mockQuery.mockReset().mockResolvedValue({ rows: [], rowCount: 0 }); mockRelease.mockClear(); });
test('commits callback queries on the same connection and releases it', async () => {
  const result = await db.withTransaction(async tx => { await tx.execute({ sql: 'UPDATE accounts SET current_balance = ? WHERE id = ?', args: [65, 2] }); return 'saved'; });
  expect(result).toBe('saved');
  expect(mockQuery.mock.calls).toEqual([['BEGIN'], ['UPDATE accounts SET current_balance = $1 WHERE id = $2', [65, 2]], ['COMMIT']]);
  expect(mockRelease).toHaveBeenCalledTimes(1);
});
test('rolls back a failed journal write without retrying the balance update', async () => {
  const failure = new Error('journal failed');
  mockQuery.mockResolvedValueOnce({}).mockResolvedValueOnce({ rows: [], rowCount: 1 }).mockRejectedValueOnce(failure).mockResolvedValueOnce({});
  await expect(db.withTransaction(async tx => { await tx.execute({ sql: 'UPDATE accounts SET current_balance = ?', args: [65] }); await tx.execute({ sql: 'INSERT INTO settings VALUES (?)', args: ['audit'] }); })).rejects.toBe(failure);
  expect(mockQuery.mock.calls.map(call => call[0])).toEqual(['BEGIN', 'UPDATE accounts SET current_balance = $1', 'INSERT INTO settings VALUES ($1)', 'ROLLBACK']);
  expect(mockRelease).toHaveBeenCalledTimes(1);
});
