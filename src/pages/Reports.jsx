import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { Download } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useFinance } from '../hooks/useFinance';
import FinancialFlow from '../components/FinancialFlow';
import {
  calcCategoryBreakdown,
  calcFinancialScore,
  calcMonthlyHistory,
  calcMonthlyTotals,
  calcRiskLevel,
  calcSavingsRate,
  exportToCSV,
  fmt,
  getFinancialMonthKey
} from '../utils/calculations';

export default function Reports() {
  const { state } = useFinance();
  const currency = state.settings.currency || 'MT';
  const startDay = state.settings.financial_month_start_day || 1;
  const { t } = useTranslation();
  const { showToast } = useOutletContext();
  const monthKey = getFinancialMonthKey(new Date(), startDay);
  const totals = calcMonthlyTotals(state.transacoes, monthKey, state.rendas, startDay);
  const score = calcFinancialScore(state.transacoes, state.budgets, monthKey, state.rendas, startDay);
  const risk = calcRiskLevel(score, t);
  const savingsRate = calcSavingsRate(totals.totalIncome, totals.totalExpenses);
  const categories = calcCategoryBreakdown(state.transacoes, 'despesa', monthKey, state.rendas, startDay);
  const history = calcMonthlyHistory(state.transacoes, state.rendas, startDay).slice(0, 12).reverse();

  // Helper to get category display name
  const getCategoryLabel = (categoryName) => {
    // Remove full translation key path if present
    let cleanName = categoryName;
    if (categoryName.startsWith('transactions.categories.')) {
      cleanName = categoryName.replace('transactions.categories.', '');
    }

    // Try to translate using the clean name
    const translationKey = `transactions.categories.${cleanName.toLowerCase().replace(/\s+/g, '_')}`;
    const translated = t(translationKey);

    // If translation exists (doesn't match the key), return it; otherwise return the clean name
    return translated !== translationKey ? translated : cleanName;
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      <div className="alert alert-ok" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {t('reports.summary_alert', { count: state.transacoes.length })}
        <button
          className="btn btn-primary"
          onClick={() => { exportToCSV(state.transacoes); showToast(t('common.toasts.csv_exported')); }}
          style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
        >
          <Download size={13} /> {t('reports.btn_export')}
        </button>
      </div>

      <div className="section-title">{t('reports.sections.health')}</div>
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            alignItems: 'center'
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: `conic-gradient(${risk.color} ${score * 3.6}deg, #ebebeb ${score * 3.6}deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}
            >
              <div
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  background: 'var(--color-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column'
                }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: risk.color, lineHeight: 1 }}>
                  {score}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>{t('reports.metrics.of_100')}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.5rem' }}>
              {risk.emoji} {risk.label}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Metric label={t('reports.metrics.income')} value={fmt(totals.totalIncome, currency)} color="var(--color-leaf)" />
            <Metric label={t('reports.metrics.expenses')} value={fmt(totals.totalExpenses, currency)} color="var(--color-coral)" />
            <Metric label={t('reports.metrics.balance')} value={fmt(totals.saldo, currency)} color={totals.saldo >= 0 ? 'var(--color-leaf)' : 'var(--color-coral)'} />
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>
                {t('reports.metrics.savings_rate')}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{savingsRate}%</div>
              <div className="progress-bar-track" style={{ marginTop: '0.3rem', height: '6px' }}>
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.max(0, Math.min(100, savingsRate))}%`,
                    background: savingsRate >= 20 ? 'var(--color-leaf)' : savingsRate >= 0 ? 'var(--color-gold)' : 'var(--color-coral)',
                    height: '6px'
                  }}
                />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>{t('reports.metrics.recommended')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-title">{t('reports.sections.flow')}</div>
      <div style={{ marginBottom: '1.5rem' }}>
        <FinancialFlow 
          transactions={state.transacoes} 
          currency={currency} 
          monthKey={monthKey}
          rendas={state.rendas}
          startDay={startDay}
        />
      </div>

      <div className="section-title">{t('reports.sections.distribution')}</div>
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        {categories.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📊</div>
            <div className="title">{t('reports.empty_state')}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {categories.map(category => (
              <div key={category.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 500 }}>{getCategoryLabel(category.category)}</span>
                  <span style={{ color: 'var(--color-muted)' }}>{fmt(category.amount, currency)} ({category.percent}%)</span>
                </div>
                <div className="progress-bar-track" style={{ height: '8px' }}>
                  <div className="progress-bar-fill" style={{ width: `${category.percent}%`, background: 'var(--color-coral)', height: '8px' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <>
          <div className="section-title">{t('reports.sections.evolution')}</div>
          <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickFormatter={value => value.split(' ')[0].slice(0, 3)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={value => `${(value / 1000).toFixed(0)}k`} />
                <RTooltip formatter={value => fmt(value, currency)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="totalIncome" name={t('reports.chart.income')} fill="#3d6b45" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalExpenses" name={t('reports.chart.expenses')} fill="#e07a5f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <div className="section-title">{t('reports.sections.history')}</div>
      <div className="glass-card" style={{ overflow: 'hidden', borderRadius: '16px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('reports.table.month')}</th>
                <th>{t('reports.table.income')}</th>
                <th>{t('reports.table.expenses')}</th>
                <th>{t('reports.table.housing')}</th>
                <th>{t('reports.table.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state">{t('reports.table.empty')}</div></td></tr>
              ) : (
                [...history].reverse().map(month => (
                  <tr key={month.month}>
                    <td style={{ fontWeight: 500 }}>{month.label}</td>
                    <td style={{ color: 'var(--color-leaf)' }}>{fmt(month.receitas, currency)}</td>
                    <td style={{ color: 'var(--color-coral)' }}>{fmt(month.despesas, currency)}</td>
                    <td style={{ color: 'var(--color-gold)' }}>{fmt(month.renda, currency)}</td>
                    <td style={{ fontWeight: 600, color: month.saldo >= 0 ? 'var(--color-leaf)' : 'var(--color-coral)' }}>
                      {fmt(month.saldo, currency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', color }}>{value}</div>
    </div>
  );
}
