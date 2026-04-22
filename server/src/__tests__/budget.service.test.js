const budgetService = require('../services/budget.service');
const { db } = require('../config/db');

// Mock the db dependency
jest.mock('../config/db', () => ({
  db: {
    execute: jest.fn()
  }
}));

describe('Budget Service', () => {
  const MOCK_HOUSEHOLD_ID = 1;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getBudgets', () => {
    it('should return budgets for a specific household', async () => {
      // Arrange
      const mockBudgets = [
        { id: 1, category: 'Food', limit_amount: 500, household_id: MOCK_HOUSEHOLD_ID }
      ];
      db.execute.mockResolvedValueOnce({ rows: mockBudgets });

      // Act
      const result = await budgetService.getBudgets(MOCK_HOUSEHOLD_ID);

      // Assert
      expect(db.execute).toHaveBeenCalledWith({
        sql: 'SELECT * FROM budgets WHERE household_id = ?',
        args: [MOCK_HOUSEHOLD_ID]
      });
      expect(result).toEqual(mockBudgets);
      expect(db.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('upsertBudget', () => {
    it('should insert or update a budget successfully', async () => {
      // Arrange
      const budgetData = { category: 'Transport', limit: 200 };
      const expectedResult = { id: 2, category: 'Transport', limit_amount: 200 };
      db.execute.mockResolvedValueOnce({ rows: [expectedResult] });

      // Act
      const result = await budgetService.upsertBudget(MOCK_HOUSEHOLD_ID, budgetData);

      // Assert
      expect(db.execute).toHaveBeenCalledWith({
        sql: expect.stringContaining('INSERT INTO budgets'),
        args: [budgetData.category, budgetData.limit, MOCK_HOUSEHOLD_ID]
      });
      expect(result).toEqual({
        id: 2,
        category: 'Transport',
        limit: 200
      });
    });

    it('should handle missing returned rows gracefully', async () => {
      // Arrange
      const budgetData = { category: 'Internet', limit: 50 };
      db.execute.mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await budgetService.upsertBudget(MOCK_HOUSEHOLD_ID, budgetData);

      // Assert
      expect(result).toEqual({
        id: 0,
        category: 'Internet',
        limit: 50
      });
    });
  });

  describe('deleteBudget', () => {
    it('should delete a budget and return success', async () => {
      // Arrange
      const MOCK_BUDGET_ID = 10;
      db.execute.mockResolvedValueOnce({});

      // Act
      const result = await budgetService.deleteBudget(MOCK_HOUSEHOLD_ID, MOCK_BUDGET_ID);

      // Assert
      expect(db.execute).toHaveBeenCalledWith({
        sql: 'DELETE FROM budgets WHERE id = ? AND household_id = ?',
        args: [MOCK_BUDGET_ID, MOCK_HOUSEHOLD_ID]
      });
      expect(result).toEqual({ success: true });
    });
  });
});
