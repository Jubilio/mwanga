import { calcMonthlyTotals, calcCategoryBreakdown, getFinancialMonthKey } from './calculations';
import { normalizeCategory } from './categories';

export const JOURNEY_SETTING_KEY = 'financial_journey_v1';
export const LESSONS = [
  { id: 'purpose', route: '/metas' },
  { id: 'assets', route: '/patrimonio' },
  { id: 'saving', route: '/metas' },
  { id: 'debt', route: '/dividas' },
  { id: 'mentor', route: '/insights' },
  { id: 'ambition', route: '/time-machine' },
  { id: 'habits', route: '/transacoes' },
  { id: 'knowledge', route: '/jornada' },
  { id: 'respect', route: '/orcamento' },
  { id: 'awareness', route: '/relatorio' },
];
export const PRIORITIES = ['stability', 'debt', 'housing', 'education', 'business', 'investment'];
export const EMPTY_JOURNEY = {
  version: 1, purpose: '', priority: 'stability', goalId: null,
  monthlyContribution: 0, completedLessons: [], closedDays: [], reviewedWeeks: [],
};
const amount = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const ids = new Set(LESSONS.map(lesson => lesson.id));

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function validDay(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function shiftDay(value, days) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weekKey(value = dayKey()) {
  const weekday = new Date(`${value}T12:00:00Z`).getUTCDay();
  return shiftDay(value, -((weekday + 6) % 7));
}

// Parse the existing string-valued settings storage without treating corrupt data
// as a saved plan. Dates and semantic IDs remain independent of UI language.
export function readJourney(value) {
  try {
    const data = typeof value === 'string' ? JSON.parse(value) : value;
    if (!data || data.version !== 1 || typeof data !== 'object') return { ...EMPTY_JOURNEY };
    return {
      ...EMPTY_JOURNEY,
      purpose: typeof data.purpose === 'string' ? data.purpose.slice(0, 200) : '',
      priority: PRIORITIES.includes(data.priority) ? data.priority : 'stability',
      goalId: Number.isSafeInteger(Number(data.goalId)) && Number(data.goalId) > 0 ? Number(data.goalId) : null,
      monthlyContribution: amount(data.monthlyContribution),
      completedLessons: [...new Set(Array.isArray(data.completedLessons) ? data.completedLessons.filter(id => ids.has(id)) : [])],
      closedDays: [...new Set(Array.isArray(data.closedDays) ? data.closedDays.filter(validDay) : [])].sort().slice(-90),
      reviewedWeeks: [...new Set(Array.isArray(data.reviewedWeeks) ? data.reviewedWeeks.filter(day => validDay(day) && weekKey(day) === day) : [])].sort().slice(-52),
    };
  } catch { return { ...EMPTY_JOURNEY }; }
}

export function goalProgress(goal, contribution, today = dayKey()) {
  if (!goal) return null;
  const target = amount(goal.alvo), saved = amount(goal.poupado);
  const remaining = Math.max(0, target - saved);
  const deadline = String(goal.prazo || '').slice(0, 10);
  const validDeadline = validDay(deadline);
  const overdue = remaining > 0 && validDeadline && deadline < today;
  const months = validDeadline && !overdue
    ? Math.max(1, (Number(deadline.slice(0, 4)) - Number(today.slice(0, 4))) * 12
      + Number(deadline.slice(5, 7)) - Number(today.slice(5, 7)) + 1) : null;
  const required = months ? Math.ceil(remaining / months * 100) / 100 : null;
  return { target, saved, remaining, percent: target > 0 ? Math.min(100, Math.round(saved / target * 100)) : 0,
    deadline: validDeadline ? deadline : null, months, required, overdue,
    gap: required === null ? null : Math.max(0, required - amount(contribution)),
    estimatedMonths: contribution > 0 ? Math.ceil(remaining / contribution) : null };
}

export function contributionScenarios(initial, monthly, months, annualRate = 0) {
  const duration = Math.min(360, Math.max(1, Math.round(Number(months) || 12)));
  const annual = Math.min(100, Math.max(-99, Number(annualRate) || 0));
  const monthlyRate = Math.pow(1 + annual / 100, 1 / 12) - 1;
  return [0.8, 1, 1.2].map((factor, index) => {
    const contribution = amount(monthly) * factor;
    let balance = amount(initial);
    for (let month = 0; month < duration; month++) balance = balance * (1 + monthlyRate) + contribution;
    return { id: ['lower', 'planned', 'higher'][index], contribution, months: duration, annualRate: annual,
      contributed: amount(initial) + contribution * duration, balance, growth: balance - amount(initial) - contribution * duration };
  });
}

export function buildJourneyReview(state, journey, today = dayKey()) {
  const start = shiftDay(today, -6), nextWeek = shiftDay(today, 7), currentWeek = weekKey(today);
  const records = (state.transacoes || []).filter(tx => validDay(String(tx.data || '').slice(0, 10))
    && String(tx.data).slice(0, 10) <= today && Number.isFinite(Number(tx.valor)) && Number(tx.valor) >= 0);
  const weekly = records.filter(tx => tx.data.slice(0, 10) >= start);
  const income = weekly.filter(tx => tx.tipo === 'receita').reduce((sum, tx) => sum + amount(tx.valor), 0);
  const expenses = weekly.filter(tx => ['despesa', 'renda'].includes(tx.tipo)).reduce((sum, tx) => sum + amount(tx.valor), 0);
  const saving = weekly.filter(tx => tx.tipo === 'poupanca').reduce((sum, tx) => sum + amount(tx.valor), 0);
  const cycleDay = Math.min(31, Math.max(1, Number(state.settings?.financial_month_start_day) || 1));
  const month = getFinancialMonthKey(today, cycleDay);
  const totals = calcMonthlyTotals(records, month, state.rendas || [], cycleDay);
  const categories = calcCategoryBreakdown(records.map(tx => tx.tipo === 'renda' ? { ...tx, tipo: 'despesa' } : tx), 'despesa', month, state.rendas || [], cycleDay);
  const budgetUsage = (state.budgets || []).map(budget => {
    const category = normalizeCategory(budget.category);
    const spent = categories.find(item => item.category === category)?.amount || 0;
    return { category, spent, limit: amount(budget.limit), excess: Math.max(0, spent - amount(budget.limit)) };
  });
  const overBudget = budgetUsage.filter(budget => budget.excess > 0).sort((a, b) => b.excess - a.excess);
  const debts = (state.dividas || []).filter(debt => debt.status !== 'paid' && amount(debt.remaining_amount) > 0);
  const dueDebts = debts.filter(debt => validDay(String(debt.due_date || '').slice(0, 10)) && debt.due_date.slice(0, 10) <= nextWeek)
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const goal = (state.metas || []).find(candidate => String(candidate.id) === String(journey.goalId));
  const goalStats = goalProgress(goal, journey.monthlyContribution, today);
  const closedDays = journey.closedDays.filter(day => day >= start && day <= today).length;
  const reviewed = journey.reviewedWeeks.includes(currentWeek);
  const habitProgress = Math.round(((closedDays / 7) + Number(reviewed) + journey.completedLessons.length / LESSONS.length) / 3 * 100);
  let action = { id: 'steady', route: '/transacoes', evidence: { count: weekly.length } };
  if (!records.length) action = { id: 'start', route: '/transacoes', evidence: { count: 0 } };
  else if (dueDebts.length) action = { id: 'debt_due', route: '/dividas', evidence: { count: dueDebts.length, date: dueDebts[0].due_date.slice(0, 10) } };
  else if (totals.totalIncome === 0) action = { id: 'missing_income', route: '/transacoes', evidence: { count: records.filter(tx => getFinancialMonthKey(tx.data, cycleDay) === month && tx.tipo === 'receita').length } };
  else if (overBudget.length) action = { id: 'budget', route: '/orcamento', evidence: { category: overBudget[0].category, excess: overBudget[0].excess } };
  else if (totals.saldo < 0) action = { id: 'cashflow', route: '/orcamento', evidence: { difference: -totals.saldo } };
  else if (!goal) action = { id: 'goal', route: '/metas', evidence: { count: (state.metas || []).length } };
  else if (goalStats.overdue || goalStats.gap > 0) action = { id: 'goal_gap', route: '/metas', evidence: { required: goalStats.required, contribution: journey.monthlyContribution, overdue: goalStats.overdue } };
  return { start, end: today, currentWeek, month, income, expenses, saving, balance: income - expenses,
    recordedDays: new Set(weekly.map(tx => tx.data.slice(0, 10))).size, recordCount: weekly.length,
    closedDays, reviewed, habitProgress, totals, overBudget, dueDebts, goal, goalStats, action,
    outstandingDebt: debts.reduce((sum, debt) => sum + amount(debt.remaining_amount), 0) };
}
