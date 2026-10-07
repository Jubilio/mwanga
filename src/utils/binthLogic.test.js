import { describe, it, expect } from 'vitest';
import { financialCycle, generateLocalBinthInsight } from './binthLogic';
const now = new Date('2026-10-07T12:00:00Z');
const tx = (tipo, valor, cat = 'food', data = '2026-10-02') => ({ tipo, valor, cat, data });
describe('Binth local insights', () => {
  it('does not describe an empty dataset as stable', () => {
    expect(generateLocalBinthInsight({}, 'dashboard', 'en', now).message).toContain('Record income');
    expect(generateLocalBinthInsight({}, 'dashboard', 'pt', now).message).toContain('Regista receitas');
  });
  it('prioritizes a real budget overrun and normalizes legacy categories', () => {
    const result = generateLocalBinthInsight({ transacoes: [tx('receita', 10000), tx('despesa', 1200)], budgets: [{ category: 'Alimentação', limit: 1000 }] }, 'dashboard', 'en', now);
    expect(result.insight_type).toBe('warning');
    expect(result.message).toContain('Food');
    expect(result.message).toContain('1200 MT');
    expect(result.quick_actions[0].route).toBe('/orcamento');
  });
  it('handles expenses without recorded income', () => {
    expect(generateLocalBinthInsight({ transacoes: [tx('despesa', 100)] }, 'dashboard', 'en', now).message).toContain('exceed income by 100 MT');
  });
  it('uses the previous month length for a cycle crossing September and October', () => {
    expect(financialCycle(now, 25)).toEqual({ days: 30, elapsed: 13 });
    expect(financialCycle(new Date('2024-03-03T12:00:00Z'), 25)).toEqual({ days: 29, elapsed: 8 });
  });
  it('filters transactions by the configured financial cycle', () => {
    const result = generateLocalBinthInsight({ settings: { financial_month_start_day: 25 }, transacoes: [tx('receita', 1000, 'salary', '2026-09-25'), tx('despesa', 2000, 'food', '2026-09-24')] }, 'dashboard', 'en', now);
    expect(result.insight_type).toBe('info');
    expect(result.data.financial_month).toBe('2026-10');
  });
});
