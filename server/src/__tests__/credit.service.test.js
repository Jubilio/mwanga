const creditService = require('../services/credit.service');
const { db } = require('../config/db');
const scoringService = require('../services/scoring.service');
const loanService = require('../services/loan.service');

// Mock dependencies
jest.mock('../config/db', () => ({
  db: {
    execute: jest.fn()
  }
}));

jest.mock('../services/scoring.service', () => ({
  calculateScore: jest.fn(),
  updateUserInfo: jest.fn()
}));

jest.mock('../services/loan.service', () => ({
  calculateLoan: jest.fn(),
  disburseLoan: jest.fn()
}));

describe('Credit Service', () => {
  const MOCK_HOUSEHOLD_ID = 1;
  const MOCK_USER_ID = 42;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getApplicationData', () => {
    it('should calculate application data correctly without exceeding affordability', async () => {
      db.execute.mockResolvedValueOnce({ rows: [{ value: '30000' }] }); // user_salary = 30000
      loanService.calculateLoan.mockReturnValueOnce({ monthlyPayment: 5000 }); // 5000 < 10000 (1/3 of 30k)

      const result = await creditService.getApplicationData(MOCK_HOUSEHOLD_ID, 'Millennium BIM', 100000, 24);

      expect(result).toEqual({
        salary: 30000,
        rate: 0.261, // BIM specific rate
        isAnnual: true,
        monthlyPayment: 5000,
        maxAllowed: 10000
      });
      expect(loanService.calculateLoan).toHaveBeenCalledWith(100000, 0.261, 24, true);
    });

    it('should throw AFFORDABILITY_EXCEEDED if monthly payment is greater than 1/3 of salary', async () => {
      db.execute.mockResolvedValueOnce({ rows: [{ value: '30000' }] }); 
      loanService.calculateLoan.mockReturnValueOnce({ monthlyPayment: 15000 }); // 15000 > 10000

      await expect(creditService.getApplicationData(MOCK_HOUSEHOLD_ID, 'BCI', 100000, 12))
        .rejects.toThrow('AFFORDABILITY_EXCEEDED');
    });

    it('should assign micro credit rates correctly', async () => {
      db.execute.mockResolvedValueOnce({ rows: [{ value: '0' }] }); // No salary
      loanService.calculateLoan.mockReturnValueOnce({ monthlyPayment: 1000 }); 

      const result = await creditService.getApplicationData(MOCK_HOUSEHOLD_ID, 'Micro Credito Express', 5000, 6);

      expect(result.rate).toBe(0.10);
      expect(result.isAnnual).toBe(false);
    });
  });

  describe('submitApplication', () => {
    it('should submit application, calculate score and insert into db', async () => {
      // getApplicationData internal calls
      db.execute.mockResolvedValueOnce({ rows: [{ value: '50000' }] }); // Salary
      loanService.calculateLoan.mockReturnValueOnce({ monthlyPayment: 5000 });
      
      scoringService.calculateScore.mockResolvedValueOnce({ score: 750, riskLevel: 'Baixo' });
      db.execute.mockResolvedValueOnce({ rows: [{ id: 99 }] }); // Insert app
      scoringService.updateUserInfo.mockResolvedValueOnce({});

      const data = { amount: 100000, months: 24, partner: 'BIM', purpose: 'Carro' };
      const files = { biDocument: [{ filename: 'bi.pdf' }] };

      const result = await creditService.submitApplication(MOCK_USER_ID, MOCK_HOUSEHOLD_ID, data, files);

      expect(db.execute).toHaveBeenNthCalledWith(2, {
        sql: expect.stringContaining('INSERT INTO credit_applications'),
        args: [MOCK_HOUSEHOLD_ID, 100000, 24, 'BIM', 'Carro', 750, 'bi.pdf', null, null, null]
      });
      expect(scoringService.updateUserInfo).toHaveBeenCalledWith(MOCK_USER_ID, 750);
      expect(result).toEqual({ id: 99, score: 750, riskLevel: 'Baixo', monthlyPayment: 5000 });
    });
  });

  describe('getApplications and getLoans', () => {
    it('should fetch applications', async () => {
      const mockApps = [{ id: 1 }];
      db.execute.mockResolvedValueOnce({ rows: mockApps });
      
      const result = await creditService.getApplications(MOCK_HOUSEHOLD_ID);
      expect(result).toEqual(mockApps);
      expect(db.execute).toHaveBeenCalledWith({
        sql: 'SELECT * FROM credit_applications WHERE household_id = ? ORDER BY created_at DESC',
        args: [MOCK_HOUSEHOLD_ID]
      });
    });

    it('should fetch loans', async () => {
      const mockLoans = [{ id: 1 }];
      db.execute.mockResolvedValueOnce({ rows: mockLoans });
      
      const result = await creditService.getLoans(MOCK_HOUSEHOLD_ID);
      expect(result).toEqual(mockLoans);
    });
  });

  describe('disburseLoan', () => {
    it('should throw NOT_FOUND if app does not exist', async () => {
      db.execute.mockResolvedValueOnce({ rows: [] });

      await expect(creditService.disburseLoan(999)).rejects.toThrow('NOT_FOUND');
    });

    it('should throw INVALID_STATUS if app is rejected', async () => {
      db.execute.mockResolvedValueOnce({ rows: [{ id: 1, status: 'rejected' }] });

      await expect(creditService.disburseLoan(1)).rejects.toThrow('INVALID_STATUS');
    });

    it('should call loanService.disburseLoan for valid pending app', async () => {
      const mockApp = { id: 1, status: 'pending', household_id: MOCK_HOUSEHOLD_ID, amount: 5000, months: 6, partner: 'Micro' };
      
      db.execute.mockResolvedValueOnce({ rows: [mockApp] }); // Fetch app
      db.execute.mockResolvedValueOnce({ rows: [{ id: MOCK_USER_ID }] }); // Fetch user
      loanService.disburseLoan.mockResolvedValueOnce(55); // Returns new loan_id

      const result = await creditService.disburseLoan(1);

      expect(db.execute).toHaveBeenCalledTimes(2);
      expect(loanService.disburseLoan).toHaveBeenCalledWith(
        1, MOCK_USER_ID, MOCK_HOUSEHOLD_ID, 5000, 0.10, 6, false
      );
      expect(result).toBe(55);
    });
  });
});
