import { describe, it, expect } from 'vitest';
import { 
  fmt, 
  fmtShort, 
  fmtPercent, 
  getFinancialMonthKey, 
  calcMonthlyTotals, 
  calcSavingsRate, 
  calcFinancialScore,
  calcCompoundInterest,
  calcMonthlySavingsNeeded
} from './calculations';

describe('Calculations Utility', () => {
  
  describe('Formatting Functions', () => {
    it('fmt should format currency correctly', () => {
      expect(fmt(1250.5)).toContain('1.250,50 MT');
      expect(fmt(0)).toContain('0,00 MT');
      // 100 MT is ~ 1.57 USD
      expect(fmt(100, 'USD')).toContain('1,57 USD');
    });

    it('fmtShort should abbreviate large numbers', () => {
      expect(fmtShort(500)).toContain('500,00 MT');
      expect(fmtShort(1500)).toBe('2k MT');
      expect(fmtShort(1500000)).toBe('1.5M MT');
    });

    it('fmtPercent should round and add %', () => {
      expect(fmtPercent(10.6)).toBe('11%');
      expect(fmtPercent(25.4)).toBe('25%');
    });
  });

  describe('Date/Month Logic', () => {
    it('getFinancialMonthKey should handle default startDay (1)', () => {
      expect(getFinancialMonthKey('2026-04-15', 1)).toBe('2026-04');
      expect(getFinancialMonthKey('2026-04-01', 1)).toBe('2026-04');
    });

    it('getFinancialMonthKey should handle custom startDay (e.g., 25th)', () => {
      // Before 25th -> current month
      expect(getFinancialMonthKey('2026-04-20', 25)).toBe('2026-04');
      // On or after 25th -> next month
      expect(getFinancialMonthKey('2026-04-25', 25)).toBe('2026-05');
      // Year transition
      expect(getFinancialMonthKey('2026-12-26', 25)).toBe('2027-01');
    });
  });

  describe('Financial Calculations', () => {
    const mockTransactions = [
      { id: 1, data: '2026-04-01', tipo: 'receita', valor: 10000, cat: 'Salário' },
      { id: 2, data: '2026-04-05', tipo: 'despesa', valor: 2000, cat: 'Alimentação' },
      { id: 3, data: '2026-04-10', tipo: 'despesa', valor: 1000, cat: 'Transporte' },
      { id: 4, data: '2026-04-15', tipo: 'renda', valor: 3000, cat: 'Habitação' }, // 'renda' is a special expense type
    ];

    it('calcMonthlyTotals should calculate correctly', () => {
      const totals = calcMonthlyTotals(mockTransactions, '2026-04', [], 1);
      expect(totals.receitas).toBe(10000);
      expect(totals.despesas).toBe(3000); // Alimentação (2000) + Transporte (1000)
      expect(totals.renda).toBe(3000);
      expect(totals.totalIncome).toBe(10000);
      expect(totals.totalExpenses).toBe(6000); // 3000 (despesas) + 3000 (renda)
      expect(totals.saldo).toBe(4000);
    });

    it('calcSavingsRate should calculate percentage', () => {
      expect(calcSavingsRate(10000, 6000)).toBe(40);
      expect(calcSavingsRate(10000, 12000)).toBe(-20);
      expect(calcSavingsRate(0, 1000)).toBe(0);
    });

    it('calcFinancialScore should return a normalized score', () => {
      const score = calcFinancialScore(mockTransactions, [], '2026-04', [], 1);
      // Base 50 + 30 (savings rate >= 30%) + 10 (has income and renda) = 90
      expect(score).toBe(90);
    });
  });

  describe('Advanced Calculations', () => {
    it('calcCompoundInterest should generate correct growth curve', () => {
      const principal = 1000;
      const monthly = 100;
      const rate = 12; // 12% per year = 1% per month
      const years = 1;
      
      const result = calcCompoundInterest(principal, monthly, rate, years);
      
      expect(result).toHaveLength(13); // 0 to 12 months
      expect(result[0].balance).toBe(1000);
      // After 1 month: 1000 * 1.01 + 100 = 1110
      expect(result[1].balance).toBe(1110);
    });

    it('calcMonthlySavingsNeeded should calculate gap correctly', () => {
      // Mock Date.now() if needed, but daysUntil uses current date
      // We'll use a date far in the future
      const target = 10000;
      const saved = 4000;
      const future = new Date();
      future.setMonth(future.getMonth() + 6); // ~6 months from now
      
      const needed = calcMonthlySavingsNeeded(target, saved, future.toISOString());
      expect(needed).toBe(1000); // 6000 / 6
    });
  });
});
