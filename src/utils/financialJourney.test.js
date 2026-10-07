import { describe, it, expect } from 'vitest';
import { readJourney, goalProgress, contributionScenarios, buildJourneyReview, weekKey } from './financialJourney';
const today = '2026-10-07';
const journey = readJourney(null);
describe('financial journey evidence and calculations', () => {
  it('rejects corrupt stored content and impossible dates', () => {
    expect(readJourney('{broken').purpose).toBe('');
    expect(readJourney({ version: 1, closedDays: ['2026-02-30', today, today], completedLessons: ['purpose', 'fake'] }).closedDays).toEqual([today]);
    expect(weekKey(today)).toBe('2026-10-05');
  });
  it('does not invent income or count future records', () => {
    const review = buildJourneyReview({ transacoes: [{ data: '2026-10-08', tipo: 'receita', valor: 100000 }] }, journey, today);
    expect(review.income).toBe(0);
    expect(review.action.id).toBe('start');
    expect(review.habitProgress).toBe(0);
  });
  it('prioritizes an upcoming debt over a goal and counts actual weekly records', () => {
    const review = buildJourneyReview({ transacoes: [{ data: today, tipo: 'receita', valor: 1000 }, { data: '2026-10-01', tipo: 'despesa', valor: 200 }], dividas: [{ remaining_amount: 300, due_date: '2026-10-10', status: 'active' }] }, journey, today);
    expect(review.balance).toBe(800);
    expect(review.action.id).toBe('debt_due');
    expect(review.action.evidence.count).toBe(1);
  });
  it('includes paid housing in budgets once and respects the configured month boundary', () => {
    const state = { settings: { financial_month_start_day: 31 }, transacoes: [{ data: '2026-09-30', tipo: 'receita', valor: 1000 }], rendas: [{ mes: '2026-10', valor: 300, estado: 'pago' }], budgets: [{ category: 'habitacao', limit: 200 }] };
    const review = buildJourneyReview(state, journey, today);
    expect(review.totals.totalIncome).toBe(0);
    expect(review.overBudget[0]?.excess).toBe(100);
    state.transacoes.push({ data: today, tipo: 'renda', cat: 'habitacao', valor: 300 });
    expect(buildJourneyReview(state, journey, today).overBudget[0].excess).toBe(100);
  });
  it('tracks habit progress independently of earnings', () => {
    const progress = { ...journey, closedDays: [today], reviewedWeeks: ['2026-10-05'], completedLessons: ['purpose'] };
    expect(buildJourneyReview({}, progress, today).habitProgress).toBe(buildJourneyReview({ transacoes: [{ data: today, tipo: 'receita', valor: 1e6 }] }, progress, today).habitProgress);
  });
  it('calculates contributions using the remaining goal and flags overdue goals', () => {
    expect(goalProgress({ alvo: 1000, poupado: 400, prazo: '2026-12-31' }, 100, today)).toMatchObject({ required: 200, gap: 100, months: 3 });
    expect(goalProgress({ alvo: 1000, poupado: 400, prazo: '2026-09-01' }, 100, today)).toMatchObject({ overdue: true, required: null });
  });
  it('uses zero returns by default, permits losses, and bounds assumptions', () => {
    expect(contributionScenarios(100, 50, 12)[1]).toMatchObject({ balance: 700, growth: 0 });
    expect(contributionScenarios(1000, 0, 12, -50)[1].balance).toBeCloseTo(500);
    expect(contributionScenarios(0, 10, 9999, 200)[1]).toMatchObject({ months: 360, annualRate: 100 });
  });
});
