import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Globe,
  TrendingDown,
  TrendingUp,
  Wallet
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis
} from 'recharts';
import BinthContextual from '../components/BinthContextual';
import { useFinance } from '../hooks/useFinance';
import {
  calcCategoryBreakdown,
  calcFinancialScore,
  calcHousingMonthlyTotal,
  calcMonthlyHistory,
  calcMonthlyTotals,
  calcRiskLevel,
  calcSavingsRate,
  fmt,
  getFinancialMonthKey
} from '../utils/calculations';
import { getPaymentMethodLabel } from '../utils/paymentMethods';

const COLORS = ['#e07a5f', '#0a4d68', '#c9963a', '#3d6b45', '#1a8fa8', '#9b59b6', '#e74c3c'];

export default function Dashboard() {
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';
  const startDay = state.settings.financial_month_start_day || 1;
  const monthKey = getFinancialMonthKey(new Date(), startDay);

  const totals = calcMonthlyTotals(state.transacoes, monthKey, state.rendas, startDay);
  const categories = calcCategoryBreakdown(state.transacoes, 'despesa', monthKey, state.rendas, startDay);
  const history = calcMonthlyHistory(state.transacoes, state.rendas, startDay).slice(0, 6).reverse();
  const score = calcFinancialScore(state.transacoes, state.budgets, monthKey, state.rendas, startDay);
  const housingSpent = calcHousingMonthlyTotal(state.transacoes, monthKey, state.rendas, startDay);
  const risk = calcRiskLevel(score);
  const savingsRate = calcSavingsRate(totals.totalIncome, totals.totalExpenses);
  const totalContas = state.contas?.reduce((acc, curr) => acc + Number(curr.current_balance || 0), 0) || 0;
  const realBalance = totals.saldo + totalContas;
  const pendingHousing = state.rendas.filter(r => r.estado === 'pendente').length;
  const pendingDebts = state.dividas.filter(d => Number(d.remaining_amount || 0) > 0).length;
  const latestTransactions = [...state.transacoes]
    .sort((a, b) => `${b.data || ''}`.localeCompare(`${a.data || ''}`) || Number(b.id || 0) - Number(a.id || 0))
    .slice(0, 7);

  const summaryCards = [
    {
      label: 'Saldos Disponíveis',
      value: totalContas,
      icon: Wallet,
      color: 'var(--color-ocean)',
      accent: '#e6f0f9',
      sub: 'M-Pesa, Bancos, eMola e mais'
    },
    {
      label: 'Receitas do Mês',
      value: totals.receitas,
      icon: TrendingUp,
      color: 'var(--color-leaf)',
      accent: '#e8f5e9',
      sub: 'Tudo o que entrou neste ciclo'
    },
    {
      label: 'Despesas do Mês',
      value: totals.totalExpenses,
      icon: TrendingDown,
      color: 'var(--color-coral)',
      accent: '#fde8e4',
      sub: housingSpent > 0 ? `Inclui habitação: ${fmt(housingSpent, currency)}` : 'Tudo o que saiu neste ciclo'
    },
    {
      label: 'Balanço Real',
      value: realBalance,
      icon: TrendingUp,
      color: realBalance >= 0 ? 'var(--color-leaf)' : 'var(--color-coral)',
      accent: realBalance >= 0 ? '#e8f5e9' : '#fde8e4',
      sub: 'Saldos disponíveis + fluxo do mês'
    }
  ];

  const pieData = categories.map(category => ({ name: category.category, value: category.amount }));

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      <div
        style={{
          marginBottom: '2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.3rem 0.6rem',
              background: 'var(--color-gold)20',
              borderRadius: '8px',
              color: 'var(--color-gold)',
              fontSize: '0.65rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '0.5rem'
            }}
          >
            <Globe size={12} /> Cockpit Financeiro NEXO
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.4rem',
              fontWeight: 900,
              color: 'var(--color-dark)',
              lineHeight: 1
            }}
          >
            Olá, {state.user?.name?.split(' ')[0] || 'Explorador'} <span style={{ color: 'var(--color-gold)' }}>✦</span>
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${score > 70 ? 'bg-leaf/10 text-leaf' : 'bg-gold/10 text-gold-deep'}`}>
              Saúde Financeira: {score > 70 ? 'Excelente' : 'Estável'}
            </span>
            <span className="rounded-full bg-ocean/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ocean">
              Nexo Score: {score}/100
            </span>
          </div>
        </div>

        <div
          className="glass-card animate-float"
          style={{
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            border: '1px solid var(--color-gold)30'
          }}
        >
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-ocean), var(--color-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '0.8rem' }}>B</div>
          <div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-muted)', fontWeight: 600 }}>ASSISTENTE VIRTUAL</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-dark)' }}>Binth ✨</div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <BinthContextual page="dashboard" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr,1fr]">
        <div className="glass-card p-6 animate-fade-in-up stagger-1" style={{ borderTop: '2px solid var(--color-ocean)' }}>
          <div className="section-title" style={{ borderBottom: 'none', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
            Painel de Controlo
          </div>
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
            O dashboard consolida transações e habitação no mesmo fluxo. Se um registo pago for removido em Habitação, os totais e o gráfico deixam de o contar.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InsightCard label="Habitação no mês" value={fmt(housingSpent, currency)} note="Valor consolidado com o módulo Habitação." tone="text-ocean" />
            <InsightCard label="Pendências de casa" value={String(pendingHousing)} note="Registos por pagar ou por confirmar." tone="text-gold" />
            <InsightCard label="Dívidas activas" value={String(pendingDebts)} note="Contas ainda em aberto para acompanhar." tone="text-coral" />
          </div>
        </div>

        <div className="glass-card p-6 animate-fade-in-up stagger-2" style={{ borderTop: '2px solid var(--color-gold)' }}>
          <div className="section-title" style={{ borderBottom: 'none', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
            Leitura do Mês
          </div>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <ReadingBlock title="Fluxo consolidado">
              Receitas: {fmt(totals.totalIncome, currency)} | Saídas: {fmt(totals.totalExpenses, currency)}
            </ReadingBlock>
            <ReadingBlock title="Maior pressão">
              {categories[0] ? `${categories[0].category}: ${fmt(categories[0].amount, currency)}` : 'Ainda sem categoria dominante neste mês.'}
            </ReadingBlock>
            <ReadingBlock title="Estado geral">
              {realBalance >= 0 ? 'A tesouraria continua respirável.' : 'O balanço real está pressionado e pede revisão imediata.'}
            </ReadingBlock>
          </div>
        </div>
      </div>

      <div className="responsive-grid mb-6">
        {summaryCards.map((card, i) => (
          <div
            key={card.label}
            className={`glass-card animate-fade-in-up stagger-${i + 1} p-5`}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderTop: `2px solid ${card.color}80`,
              boxShadow: `0 8px 30px ${card.color}15, 0 1px 3px rgba(0,0,0,0.1)`
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '100px',
                background: `linear-gradient(to bottom, ${card.color}15, transparent)`,
                pointerEvents: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--color-muted)', marginBottom: '0.4rem' }}>
                  {card.label}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: card.color }}>
                  {fmt(card.value, currency)}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                  {card.sub}
                </div>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: card.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={20} style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-title mt-2">Seus Meios de Pagamento</div>
      <div className="glass-card mb-6 p-6 animate-fade-in-up stagger-1">
        <p className="mb-4 text-sm text-gray-500">
          Adicione espécie, M-Pesa, eMola, mKesh ou banco para refletir melhor como faz e recebe pagamentos no dia a dia.
        </p>
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {state.contas?.map(conta => (
            <div key={conta.id} className="relative rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="text-xs uppercase tracking-widest text-muted">{getPaymentMethodLabel(conta.type)}</div>
              <div className="text-lg font-bold">{conta.name}</div>
              <div className="mt-1 font-bold text-ocean">{fmt(conta.current_balance, currency)}</div>
              <button
                onClick={() => {
                  if (confirm('Remover esta conta?')) {
                    dispatch({ type: 'DELETE_ACCOUNT', payload: conta.id });
                  }
                }}
                className="absolute right-4 top-4 text-gray-400 hover:text-coral"
              >
                <AlertTriangle size={14} />
              </button>
            </div>
          ))}
        </div>

        <form
          className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-black/5 p-4 dark:border-gray-800 dark:bg-white/5"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            dispatch({
              type: 'ADD_ACCOUNT',
              payload: {
                name: fd.get('name'),
                type: fd.get('type'),
                initial_balance: Number(fd.get('balance'))
              }
            });
            e.target.reset();
          }}
        >
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-semibold">NOME</label>
            <input name="name" type="text" className="input py-2 text-sm" placeholder="Ex: Espécie, M-Pesa Pessoal, BIM..." required />
          </div>
          <div className="w-1/4 min-w-[120px]">
            <label className="mb-1 block text-xs font-semibold">MEIO</label>
            <select name="type" className="input py-2 text-sm" required>
              <option value="dinheiro">Dinheiro</option>
              <option value="mpesa">M-Pesa</option>
              <option value="emola">eMola</option>
              <option value="mkesh">mKesh</option>
              <option value="banco">Banco</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div className="w-1/4 min-w-[120px]">
            <label className="mb-1 block text-xs font-semibold">SALDO ACTUAL</label>
            <input name="balance" type="number" step="any" className="input py-2 text-sm" placeholder="Ex: 5000" required />
          </div>
          <button type="submit" className="btn btn-primary whitespace-nowrap py-2 text-sm font-semibold">
            Adicionar Meio
          </button>
        </form>
      </div>

      <div className="responsive-grid mb-6">
        <div className="glass-card animate-fade-in-up stagger-1" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
            Score Financeiro
          </div>
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: `6px solid ${risk.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 0.75rem',
              background: `conic-gradient(${risk.color} ${score * 3.6}deg, #ebebeb ${score * 3.6}deg)`,
              position: 'relative'
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: '1.8rem',
                fontWeight: 700,
                color: risk.color
              }}
            >
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

        <div className="animate-fade-in-up stagger-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {totals.saldo < 0 && (
            <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={18} /> As despesas consolidadas estão a superar as receitas neste mês. Reveja os gastos.
            </div>
          )}
          {housingSpent === 0 && (
            <div className="alert alert-warn" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Bell size={18} /> Nenhum custo de habitação consolidado neste mês.
            </div>
          )}
          {totals.saldo > 0 && totals.receitas > 0 && (
            <div className="alert alert-ok" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <CheckCircle size={18} /> Saldo positivo. Considere poupar parte do excedente.
            </div>
          )}
          {savingsRate >= 20 && (
            <div className="alert alert-ok" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <CheckCircle size={18} /> Taxa de poupança excelente ({savingsRate}%). Continue assim.
            </div>
          )}
          {savingsRate > 0 && savingsRate < 20 && (
            <div className="alert alert-warn" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={18} /> Taxa de poupança abaixo de 20%. Tente reduzir despesas não essenciais.
            </div>
          )}
        </div>
      </div>

      <div className="responsive-grid mb-6">
        {history.length > 0 && (
          <div className="glass-card animate-fade-in-up stagger-3" style={{ padding: '1.25rem' }}>
            <div className="section-title" style={{ borderBottom: 'none', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              Fluxo Consolidado
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
                <RTooltip formatter={(value) => fmt(value, currency)} labelStyle={{ fontWeight: 600 }} />
                <Area type="monotone" dataKey="totalIncome" name="Receitas" stroke="#3d6b45" fill="url(#colorIncome)" strokeWidth={2} />
                <Area type="monotone" dataKey="totalExpenses" name="Despesas Consolidadas" stroke="#e07a5f" fill="url(#colorExpense)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

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
                <RTooltip formatter={value => fmt(value, currency)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '0.72rem' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="section-title">Últimas Transações</div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th className="hide-mobile">Tipo</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {latestTransactions.length === 0 ? (
              <tr><td colSpan={4} className="empty-state">Sem transações registadas</td></tr>
            ) : (
              latestTransactions.map(transaction => (
                <tr key={transaction.id}>
                  <td style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>{transaction.data}</td>
                  <td style={{ fontWeight: 500 }}>{transaction.desc}</td>
                  <td className="hide-mobile"><span className={`badge badge-${transaction.tipo}`}>{transaction.tipo}</span></td>
                  <td
                    style={{
                      fontWeight: 600,
                      color: transaction.tipo === 'despesa' ? 'var(--color-coral)' : 'var(--color-leaf)'
                    }}
                  >
                    {transaction.tipo === 'despesa' ? '−' : '+'}{fmt(transaction.valor, currency)}
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

function InsightCard({ label, value, note, tone }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${tone}`}>{value}</div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{note}</div>
    </div>
  );
}

function ReadingBlock({ title, children }) {
  return (
    <div className="rounded-2xl bg-black/5 p-4 dark:bg-white/5">
      <div className="font-semibold text-gray-800 dark:text-white">{title}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
