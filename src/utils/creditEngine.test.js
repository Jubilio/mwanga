import { describe, it, expect } from 'vitest';
import { CreditEngine } from './creditEngine';

describe('CreditEngine', () => {
  it('calculates compound interest correctly', () => {
    const result = CreditEngine.compound(1000, 0.01, 12);
    expect(result).toBeCloseTo(1126.83, 2);
  });

  it('calculates monthly installment (Price Table) correctly', () => {
    // 100,000 MT at 2% monthly for 12 months
    const result = CreditEngine.installment(100000, 0.02, 12);
    expect(result).toBeCloseTo(9455.96, 2);
  });

  it('calculates monthly installment with annual rate correctly', () => {
    // 100,000 MT at 24% annual for 12 months
    // 24% annual is approx 1.808% monthly if compounded
    const result = CreditEngine.installment(100000, 0.24, 12, true);
    expect(result).toBeCloseTo(9345.25, 0);
  });

  it('suggests minimum months correctly', () => {
    // If I want to pay at most 5000/month for 100,000 at 2% monthly
    const months = CreditEngine.suggestMinMonths(100000, 0.02, 5000);
    expect(months).toBe(26);
  });

  it('returns high value for unattainable suggestsMinMonths', () => {
    // Trying to pay 1000/month for 100,000 at 2% monthly (interest alone is 2000)
    const months = CreditEngine.suggestMinMonths(100000, 0.02, 1000);
    expect(months).toBe(120);
  });
});
