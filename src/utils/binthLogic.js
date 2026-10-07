import { calcMonthlyTotals, calcCategoryBreakdown, getFinancialMonthKey } from './calculations';
import { normalizeCategory } from './categories';
import i18n from '../i18n';

// UTC matches the transaction date keys used by the finance calculations.
export function financialCycle(now, startDay = 1) {
  const day = Math.min(28, Math.max(1, Number(startDay) || 1));
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const offset = now.getUTCDate() < day ? -1 : 0;
  const start = Date.UTC(year, month + offset, day);
  const end = Date.UTC(year, month + offset + 1, day);
  const today = Date.UTC(year, month, now.getUTCDate());
  return { days: (end - start) / 86400000, elapsed: (today - start) / 86400000 + 1 };
}

export function generateLocalBinthInsight(state = {}, page, language = 'pt', now = new Date()) {
  const { transacoes = [], budgets = [], rendas = [], settings = {} } = state;
  const t = i18n.getFixedT(language.startsWith('en') ? 'en' : 'pt');
  const startDay = Math.min(28, Math.max(1, Number(settings.financial_month_start_day) || 1));
  const monthKey = getFinancialMonthKey(now.toISOString(), startDay);
  const totals = calcMonthlyTotals(transacoes, monthKey, rendas, startDay);
  const categories = calcCategoryBreakdown(transacoes, 'despesa', monthKey, rendas, startDay);
  const action = (key, route) => ({ label: t(`binth_local.${key}`), route });
  const result = (key, values = {}, type = 'info', actions = [action('add', '/transacoes')]) => ({
    insight_type: type, message: t(`binth_local.${key}`, values), alerta: null,
    biblical_insight: null, quick_actions: actions,
    data: { local_intelligence: true, financial_month: monthKey }
  });
  if (!totals.totalIncome && !totals.totalExpenses) return result('empty');
  const warnings = budgets.map(b => {
    const spent = categories.find(c => c.category === normalizeCategory(b.category))?.amount || 0;
    const limit = Number(b.limit ?? b.limit_amount ?? 0);
    return { category: t(`common.categories.${normalizeCategory(b.category)}`, { defaultValue: b.category }), spent, limit, pct: limit > 0 ? spent / limit : 0 };
  }).sort((a, b) => (b.spent - b.limit) - (a.spent - a.limit));
  const over = warnings.find(b => b.spent > b.limit);
  if (over) return result('over', { ...over, spent: Math.round(over.spent), limit: Math.round(over.limit) }, 'warning', [action('review', '/orcamento'), action('expenses', '/transacoes')]);
  if (totals.totalExpenses > totals.totalIncome) return result('negative', { deficit: Math.round(totals.totalExpenses - totals.totalIncome) }, 'warning', [action('expenses', '/transacoes'), action('review', '/orcamento')]);
  const near = warnings.find(b => b.pct >= 0.85);
  if (near) return result('near', { category: near.category, percent: Math.round(near.pct * 100) }, 'action', [action('review', '/orcamento')]);
  const cycle = financialCycle(now, startDay);
  const projected = totals.totalExpenses / cycle.elapsed * cycle.days;
  if (page === 'dashboard' && cycle.elapsed > 5 && totals.totalIncome > 0 && projected > totals.totalIncome * 0.95) return result('pace', { projected: Math.round(projected), income: Math.round(totals.totalIncome) }, 'warning', [action('review', '/orcamento')]);
  if (totals.totalIncome > 0 && totals.poupanca >= totals.totalIncome * 0.15) return result('saving', { percent: Math.round(totals.poupanca / totals.totalIncome * 100) }, 'celebration', [action('goals', '/metas')]);
  const top = categories[0];
  if (top && top.amount > totals.totalExpenses * 0.35) return result('concentration', { category: t(`common.categories.${top.category}`, { defaultValue: top.category }) }, 'opportunity', [action('expenses', '/transacoes')]);
  return result('stable');
}
