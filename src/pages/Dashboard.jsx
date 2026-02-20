import { useFinance } from '../hooks/useFinanceStore';
import {
  TrendingUp, TrendingDown, Home as HomeIcon, Wallet,
  AlertTriangle, CheckCircle, Bell,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  fmt, calcMonthlyTotals, calcCategoryBreakdown,
  calcMonthlyHistory, calcFinancialScore, calcRiskLevel,
  calcSavingsRate, getMonthKey,
} from '../utils/calculations';

const COLORS = ['#e07a5f', '#0a4d68', '#c9963a', '#3d6b45', '#1a8fa8', '#9b59b6', '#e74c3c'];

export default function Dashboard() {
  const { state } = useFinance();
  const currency = state.settings.currency || 'MT';
  const monthKey = getMonthKey();
  const tot = calcMonthlyTotals(state.transacoes, monthKey, state.rendas);
  const categories = calcCategoryBreakdown(state.transacoes, 'despesa', monthKey, state.rendas);
  const history = calcMonthlyHistory(state.transacoes, state.rendas).slice(0, 6).reverse();
  const score = calcFinancialScore(state.transacoes, state.budgets, monthKey, state.rendas);
  const risk = calcRiskLevel(score);
  const savingsRate = calcSavingsRate(tot.totalIncome, tot.despesas + tot.renda);

  const summaryCards = [
    { label: 'Receitas', value: tot.receitas, icon: TrendingUp, color: 'var(--color-leaf)', accent: '#e8f5e9', sub: 'Salários + extras' },
    { label: 'Despesas', value: tot.despesas, icon: TrendingDown, color: 'var(--color-coral)', accent: '#fde8e4', sub: 'Gastos do mês' },
    { label: 'Renda Casa', value: tot.renda, icon: HomeIcon, color: 'var(--color-gold)', accent: '#fff8e6', sub: 'Arrendamento Pemba' },
    { label: 'Saldo Líquido', value: tot.saldo, icon: Wallet, color: tot.saldo >= 0 ? 'var(--color-leaf)' : 'var(--color-coral)', accent: tot.saldo >= 0 ? '#e8f5e9' : '#fde8e4', sub: 'Receitas − Despesas' },
  ];

  const pieData = categories.map(c => ({ name: c.category, value: c.amount }));

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      
      {/* Welcome Message */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-ocean)' }}>
          Olá, {state.user?.name?.split(' ')[0] || 'Explorador'} <span style={{ color: 'var(--color-gold)' }}>✦</span>
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
          Aqui está o resumo financeiro da <strong style={{ color: 'var(--color-ocean)' }}>{state.settings.household_name || 'sua família'}</strong> para este mês.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {summaryCards.map((card, i) => (
          <div
            key={card.label}
            className={`glass-card animate-fade-in-up stagger-${i + 1}`}
            style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
              background: card.color,
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--color-muted)', marginBottom: '0.4rem' }}>
                  {card.label}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: card.color,
                }}>
                  {fmt(card.value, currency)}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                  {card.sub}
                </div>
              </div>
              <div style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: card.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <card.icon size={20} style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Score + Alerts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {/* Financial Score */}
        <div className="glass-card animate-fade-in-up stagger-1" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
            Score Financeiro
          </div>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            border: `6px solid ${risk.color}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 0.75rem',
            background: `conic-gradient(${risk.color} ${score * 3.6}deg, #ebebeb ${score * 3.6}deg)`,
            position: 'relative',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'var(--color-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              fontWeight: 700,
              color: risk.color,
            }}>
              {score}
            </div>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {risk.emoji} Risco {risk.level}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Taxa poupança: {savingsRate}%
          </div>
        </div>

        {/* Alerts */}
        <div className="animate-fade-in-up stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tot.saldo < 0 && (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={18} /> As despesas estão a superar as receitas este mês. Reveja os gastos.
            </div>
          )}
          {tot.renda === 0 && (
            <div className="alert alert-warn" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Bell size={18} /> Nenhuma renda da casa registada este mês.
            </div>
          )}
          {tot.saldo > 0 && tot.receitas > 0 && (
            <div className="alert alert-ok" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <CheckCircle size={18} /> Saldo positivo — considere poupar parte do excedente.
            </div>
          )}
          {savingsRate >= 20 && (
            <div className="alert alert-ok" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <CheckCircle size={18} /> Taxa de poupança excelente ({savingsRate}%). Continue assim! 🎉
            </div>
          )}
          {savingsRate > 0 && savingsRate < 20 && (
            <div className="alert alert-warn" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={18} /> Taxa de poupança abaixo de 20%. Tente reduzir despesas não essenciais.
            </div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {/* Cash Flow Chart */}
        {history.length > 0 && (
          <div className="glass-card animate-fade-in-up stagger-3" style={{ padding: '1.25rem' }}>
            <div className="section-title" style={{ borderBottom: 'none', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              Fluxo de Caixa
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3d6b45" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3d6b45" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e07a5f" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e07a5f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} tickFormatter={v => v.split(' ')[0].slice(0, 3)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <RTooltip formatter={(v) => fmt(v, currency)} labelStyle={{ fontWeight: 600 }} />
                <Area type="monotone" dataKey="totalIncome" name="Receitas" stroke="#3d6b45" fill="url(#colorIncome)" strokeWidth={2} />
                <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#e07a5f" fill="url(#colorExpense)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <div className="glass-card animate-fade-in-up stagger-4" style={{ padding: '1.25rem' }}>
            <div className="section-title" style={{ borderBottom: 'none', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              Despesas por Categoria
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <RTooltip formatter={v => fmt(v, currency)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '0.72rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Latest Transactions */}
      <div className="section-title">Últimas Transações</div>
      <div className="glass-card" style={{ overflow: 'hidden', borderRadius: '16px' }}>
        <table className="data-table">
          <thead>
            <tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr>
          </thead>
          <tbody>
            {state.transacoes.length === 0 ? (
              <tr><td colSpan={4} className="empty-state">Sem transações registadas</td></tr>
            ) : (
              state.transacoes.slice(0, 7).map(t => (
                <tr key={t.id}>
                  <td style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>{t.data}</td>
                  <td style={{ fontWeight: 500 }}>{t.desc}</td>
                  <td><span className={`badge badge-${t.tipo}`}>{t.tipo}</span></td>
                  <td style={{
                    fontWeight: 600,
                    color: t.tipo === 'despesa' ? 'var(--color-coral)' : 'var(--color-leaf)',
                  }}>
                    {t.tipo === 'despesa' ? '−' : '+'}{fmt(t.valor, currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
