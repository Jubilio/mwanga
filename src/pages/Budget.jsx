import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFinance } from '../hooks/useFinance';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { fmt, calcCategoryBreakdown, getFinancialMonthKey } from '../utils/calculations';
import { normalizeCategory, MAIN_CATEGORIES } from '../utils/categories';

const EXPENSE_CATEGORIES = MAIN_CATEGORIES.filter(c => c !== 'salary');

export default function Budget() {
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';
  const startDay = state.settings.financial_month_start_day || 1;
  const { showToast } = useOutletContext();
  const monthKey = getFinancialMonthKey(new Date(), startDay);

  const [newCat, setNewCat] = useState(EXPENSE_CATEGORIES[0]);
  const [newLimit, setNewLimit] = useState('');

  const categories = calcCategoryBreakdown(state.transacoes, 'despesa', monthKey, state.rendas, startDay);

  function handleAdd(e) {
    e.preventDefault();
    if (!newLimit) {
      showToast(t('budget.toasts.define_limit'));
      return;
    }

    dispatch({ type: 'SET_BUDGET', payload: { category: newCat, limit: parseFloat(newLimit) } });
    setNewLimit('');
    showToast(t('budget.toasts.budget_set'));
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="section-title">{t('budget.set_limit_title')}</div>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 180px' }}>
            <label className="form-label">{t('budget.category_label')}</label>
            <select className="form-input" value={newCat} onChange={e => setNewCat(e.target.value)}>
              {EXPENSE_CATEGORIES.map((category) => (
                <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={category} value={category}>
                  {t(`common.categories.${category}`)}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <label className="form-label">{t('budget.limit_label')}</label>
            <input
              type="number"
              className="form-input"
              placeholder={t('budget.limit_placeholder')}
              value={newLimit}
              onChange={e => setNewLimit(e.target.value)}
              min="0"
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginBottom: '0.1rem' }}>
            <Plus size={16} /> {t('budget.set_btn')}
          </button>
        </form>
      </div>

      <div className="section-title">{t('budget.month_title')}</div>

      {state.budgets.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="icon">📊</div>
            <div className="title">{t('budget.empty_title')}</div>
            <div className="subtitle">{t('budget.empty_subtitle')}</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-indigo-700 dark:border-indigo-700/30 dark:bg-indigo-900/10 dark:text-indigo-400">
            <span className="text-base shrink-0">📖</span>
            <div className="text-[12px] leading-relaxed">
              <span className="font-bold">{t('budget.bible_principle_title')}: </span>
              {t('budget.bible_principle_text')}
            </div>
          </div>

          {state.budgets.map((budget) => {
            const normalizedKey = normalizeCategory(budget.category);
            const spent = categories.find(category => category.category === normalizedKey)?.amount || 0;
            const budgetLimit = Number(budget.limit || 0);
            const pct = budgetLimit > 0 ? Math.min(100, Math.round((spent / budgetLimit) * 100)) : (spent > 0 ? 100 : 0);
            const isOver = pct >= 100;
            const isWarning = pct >= 80 && !isOver;
            const barColor = isOver ? 'var(--color-coral)' : isWarning ? 'var(--color-gold)' : 'var(--color-leaf)';

            return (
              <div key={budget.id || budget.category} className="glass-card animate-fade-in-up" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t(`common.categories.${normalizedKey}`)}</span>
                    {isOver && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-coral)', fontWeight: 600 }}>
                        <AlertTriangle size={13} style={{ verticalAlign: 'text-bottom' }} /> {t('budget.status.over')}
                      </span>
                    )}
                    {isWarning && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-gold)', fontWeight: 600 }}>
                        ⚠️ {t('budget.status.warning')}
                      </span>
                    )}
                    {!isOver && !isWarning && pct > 0 && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-leaf)', fontWeight: 600 }}>
                        <CheckCircle size={13} style={{ verticalAlign: 'text-bottom' }} /> {t('budget.status.ok')}
                      </span>
                    )}
                  </div>

                  <button
                    className="btn btn-danger"
                    onClick={() => {
                      dispatch({
                        type: 'DELETE_BUDGET',
                        payload: budget.id,
                        meta: { category: budget.category }
                      });
                      showToast(t('budget.toasts.budget_removed'));
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.4rem' }}>
                  <span>{t('budget.spent', { amount: fmt(spent, currency) })}</span>
                  <span>{t('budget.goal', { amount: fmt(budget.limit, currency) })}</span>
                </div>

                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.73rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>
                  <span>{t('budget.pct_used', { pct })}</span>
                  <span>{t('budget.remaining', { amount: fmt(Math.max(0, budget.limit - spent), currency) })}</span>
                </div>

                {isOver && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.68rem', color: 'var(--color-coral)', display: 'flex', gap: 5, alignItems: 'flex-start', opacity: 0.9 }}>
                    <span>📖</span>
                    <em>{t('budget.over_principle')}</em>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
