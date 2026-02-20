import { useOutletContext } from 'react-router-dom';
import { useFinance } from '../hooks/useFinanceStore';
import { Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  fmt, calcMonthlyTotals, calcCategoryBreakdown,
  calcMonthlyHistory, calcFinancialScore, calcRiskLevel,
  calcSavingsRate, getMonthKey, exportToCSV,
} from '../utils/calculations';

export default function Reports() {
  const { state } = useFinance();
  const { showToast } = useOutletContext();
  const monthKey = getMonthKey();
  const tot = calcMonthlyTotals(state.transacoes, monthKey);
  const score = calcFinancialScore(state.transacoes, state.budgets, monthKey);
  const risk = calcRiskLevel(score);
  const savingsRate = calcSavingsRate(tot.totalIncome, tot.despesas);
  const categories = calcCategoryBreakdown(state.transacoes, 'despesa', monthKey);
  const history = calcMonthlyHistory(state.transacoes).slice(0, 12).reverse();

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      {/* Summary Alert */}
      <div className="alert alert-ok" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📊 Relatório baseado nas {state.transacoes.length} transações registadas.
        <button
          className="btn btn-primary"
          onClick={() => { exportToCSV(state.transacoes); showToast('📥 CSV exportado!'); }}
          style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
        >
          <Download size={13} /> Exportar
        </button>
      </div>

      {/* Health Score */}
      <div className="section-title">Saúde Financeira</div>
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          alignItems: 'center',
        }}>
          {/* Score Ring */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: `conic-gradient(${risk.color} ${score * 3.6}deg, #ebebeb ${score * 3.6}deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
            }}>
              <div style={{
                width: '96px', height: '96px', borderRadius: '50%',
                background: 'var(--color-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: risk.color, lineHeight: 1 }}>
                  {score}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)' }}>de 100</div>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.5rem' }}>
              {risk.emoji} Risco {risk.level}
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>
                Receitas Totais
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-leaf)' }}>{fmt(tot.totalIncome)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>
                Despesas Totais
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-coral)' }}>{fmt(tot.despesas)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>
                Saldo do Mês
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: tot.saldo >= 0 ? 'var(--color-leaf)' : 'var(--color-coral)' }}>
                {fmt(tot.saldo)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>
                Taxa de Poupança
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{savingsRate}%</div>
              <div className="progress-bar-track" style={{ marginTop: '0.3rem', height: '6px' }}>
                <div className="progress-bar-fill" style={{
                  width: `${Math.max(0, Math.min(100, savingsRate))}%`,
                  background: savingsRate >= 20 ? 'var(--color-leaf)' : savingsRate >= 0 ? 'var(--color-gold)' : 'var(--color-coral)',
                  height: '6px',
                }} />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Recomendado: ≥ 20%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Distribution */}
      <div className="section-title">Distribuição de Despesas (Mês Actual)</div>
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        {categories.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📊</div>
            <div className="title">Sem despesas para analisar</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {categories.map(c => (
              <div key={c.category}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 500 }}>{c.category}</span>
                  <span style={{ color: 'var(--color-muted)' }}>{fmt(c.amount)} ({c.percent}%)</span>
                </div>
                <div className="progress-bar-track" style={{ height: '8px' }}>
                  <div className="progress-bar-fill" style={{ width: `${c.percent}%`, background: 'var(--color-coral)', height: '8px' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly History Chart */}
      {history.length > 0 && (
        <>
          <div className="section-title">Evolução Mensal</div>
          <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickFormatter={v => v.split(' ')[0].slice(0, 3)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <RTooltip formatter={v => fmt(v)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '0.75rem' }} />
                <Bar dataKey="totalIncome" name="Receitas" fill="#3d6b45" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#e07a5f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Monthly History Table */}
      <div className="section-title">Histórico Mensal</div>
      <div className="glass-card" style={{ overflow: 'hidden', borderRadius: '16px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>Mês</th><th>Receitas</th><th>Despesas</th><th>Renda</th><th>Saldo</th></tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={5}><div className="empty-state">Sem dados</div></td></tr>
              ) : (
                [...history].reverse().map(m => (
                  <tr key={m.month}>
                    <td style={{ fontWeight: 500 }}>{m.label}</td>
                    <td style={{ color: 'var(--color-leaf)' }}>{fmt(m.receitas)}</td>
                    <td style={{ color: 'var(--color-coral)' }}>{fmt(m.despesas)}</td>
                    <td style={{ color: 'var(--color-gold)' }}>{fmt(m.renda)}</td>
                    <td style={{ fontWeight: 600, color: m.saldo >= 0 ? 'var(--color-leaf)' : 'var(--color-coral)' }}>
                      {fmt(m.saldo)}
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
