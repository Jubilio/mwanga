import { useFinance } from '../hooks/useFinanceStore';
import {
  TrendingUp, TrendingDown, Home as HomeIcon, Wallet,
  AlertTriangle, CheckCircle, Bell, Globe,
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
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';
  const monthKey = getMonthKey();
  const tot = calcMonthlyTotals(state.transacoes, monthKey, state.rendas);
  const categories = calcCategoryBreakdown(state.transacoes, 'despesa', monthKey, state.rendas);
  const history = calcMonthlyHistory(state.transacoes, state.rendas).slice(0, 6).reverse();
  const score = calcFinancialScore(state.transacoes, state.budgets, monthKey, state.rendas);
  const risk = calcRiskLevel(score);
  const savingsRate = calcSavingsRate(tot.totalIncome, tot.despesas + tot.renda);
  const totalContas = state.contas?.reduce((acc, curr) => acc + curr.current_balance, 0) || 0;
  const realBalance = tot.saldo + totalContas;

  // --- BINTH'S AI BRAIN (Proactive Insights) ---
  const getBinthAdvice = () => {
    const advice = [];
    
    // Savings Rate Logic
    if (savingsRate < 20) {
      advice.push({
        text: `Olá ${state.user?.name?.split(' ')[0]}! Notei que sua taxa de poupança está em ${savingsRate}%. Para uma vida financeira premium, tente atingir os 20%. Que tal rever a categoria "${categories[0]?.category || 'Geral'}"?`,
        type: 'warn'
      });
    } else if (savingsRate >= 30) {
      advice.push({
        text: `Incrível! Sua taxa de poupança está em ${savingsRate}%. Você está no topo dos 5% da NEXO VIBE. Já pensou em diversificar seus investimentos?`,
        type: 'success'
      });
    }

    // Rent Logic
    if (tot.renda === 0) {
      advice.push({
        text: "Ainda não registou a renda da casa este mês. Manter os pagamentos em dia é o segredo do investidor de elite.",
        type: 'info'
      });
    }

    // Surplus logic
    if (tot.saldo > 10000) {
      advice.push({
        text: `Tens um excedente de ${fmt(tot.saldo, currency)}. Que tal colocar uma parte disto na tua meta de poupança?`,
        type: 'action'
      });
    }

    if (totalContas === 0) {
      advice.push({
        text: "Parece que ainda não registou o saldo das suas contas (M-Pesa, e-Mola, Bancos). Registe os seus saldos iniciais para que possamos monitorar o seu verdadeiro Património Líquido.",
        type: 'info'
      });
    }

    return advice;
  };

  const binthTips = getBinthAdvice();

  const summaryCards = [
    { label: 'Saldos Disponíveis', value: totalContas, icon: Wallet, color: 'var(--color-ocean)', accent: '#e6f0f9', sub: 'M-Pesa, Bancos, etc.' },
    { label: 'Receitas (Mês)', value: tot.receitas, icon: TrendingUp, color: 'var(--color-leaf)', accent: '#e8f5e9', sub: 'O que entrou' },
    { label: 'Despesas (Mês)', value: tot.despesas + tot.renda, icon: TrendingDown, color: 'var(--color-coral)', accent: '#fde8e4', sub: 'O que saiu' },
    { label: 'Balanço Real', value: realBalance, icon: TrendingUp, color: realBalance >= 0 ? 'var(--color-leaf)' : 'var(--color-coral)', accent: realBalance >= 0 ? '#e8f5e9' : '#fde8e4', sub: 'Saldos + Fluxo do Mês' },
  ];

  const pieData = categories.map(c => ({ name: c.category, value: c.amount }));

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      
      {/* ─── PREMIUM HEADER ─── */}
      <div style={{ 
        marginBottom: '2.5rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ 
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
          }}>
            <Globe size={12} /> Experiência Premium NEXO
          </div>
          <h1 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '2.4rem', 
            fontWeight: 900, 
            color: 'var(--color-dark)',
            lineHeight: 1
          }}>
            Olá, {state.user?.name?.split(' ')[0] || 'Explorador'} <span style={{ color: 'var(--color-gold)' }}>✦</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${score > 70 ? 'bg-leaf/10 text-leaf' : 'bg-gold/10 text-gold-deep'}`}>
              SAÚDE FINANCEIRA: {score > 70 ? 'EXCELENTE' : 'ESTÁVEL'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-ocean/10 text-ocean text-[10px] font-bold uppercase tracking-wider">
              NEXO SCORE: {score}/100
            </span>
          </div>
        </div>
        
        {/* Binth Mini Badge */}
        <div className="glass-card animate-float" style={{ 
          padding: '0.5rem 1rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem',
          border: '1px solid var(--color-gold)30'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-ocean), var(--color-gold))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '0.8rem' }}>B</div>
          <div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-muted)', fontWeight: 600 }}>ASSISTENTE VIRTUAL</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-dark)' }}>Binth ✨</div>
          </div>
        </div>
      </div>

      {/* ─── BINTH'S INSIGHTS (NEW) ─── */}
      {binthTips.length > 0 && (
        <div className="glass-card animate-fade-in-up stagger-1" style={{ 
          padding: '1.5rem', 
          marginBottom: '2rem', 
          background: 'linear-gradient(135deg, var(--color-midnight), #1c3545)',
          color: 'white',
          border: 'none',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '12px', 
              background: 'rgba(255,255,255,0.1)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--color-gold)' 
            }}>
              <Bell size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Conselhos da Binth</h3>
              <p style={{ fontSize: '0.7rem', opacity: 0.6 }}>BASEADO NO TEU COMPORTAMENTO ACTUAL</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {binthTips.map((tip, idx) => (
              <div key={idx} style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '0.75rem', 
                padding: '0.75rem', 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: '12px',
                fontSize: '0.88rem'
              }}>
                <div style={{ marginTop: '0.2rem' }}>
                  {tip.type === 'warn' ? <AlertTriangle size={16} color="var(--color-gold)" /> : <CheckCircle size={16} color="var(--color-leaf-light)" />}
                </div>
                {tip.text}
              </div>
            ))}
          </div>
        </div>
      )}

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

      {/* ─── WALLETS & ACCOUNTS MANAGEMENT ─── */}
      <div className="section-title mt-2">Suas Contas (Saldos Iniciais)</div>
      <div className="glass-card p-6 mb-6 animate-fade-in-up stagger-1">
        <p className="text-sm text-gray-500 mb-4">Adicione as suas contas (banco, M-Pesa, numerário) para refletir o seu património inicial real.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {state.contas?.map(conta => (
            <div key={conta.id} className="p-4 border border-gray-200 dark:border-gray-800 rounded-xl relative">
              <div className="text-xs uppercase tracking-widest text-muted">{conta.type}</div>
              <div className="font-bold text-lg">{conta.name}</div>
              <div className="text-ocean font-bold mt-1">{fmt(conta.current_balance, currency)}</div>
              <button onClick={() => {
                if(confirm('Remover esta conta?')) {
                  dispatch({ type: 'DELETE_ACCOUNT', payload: conta.id });
                }
              }} className="absolute top-4 right-4 text-gray-400 hover:text-coral">
                <AlertTriangle size={14} />
              </button>
            </div>
          ))}
        </div>
        
        <form 
          className="flex flex-wrap gap-3 items-end bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-gray-800"
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
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold mb-1">NOME DA CONTA</label>
            <input name="name" type="text" className="input py-2 text-sm" placeholder="Ex: M-Pesa, BCI, Millennium..." required />
          </div>
          <div className="w-1/4 min-w-[120px]">
            <label className="block text-xs font-semibold mb-1">TIPO</label>
            <select name="type" className="input py-2 text-sm" required>
              <option value="mobile">Carteira Móvel</option>
              <option value="bank">Banco</option>
              <option value="cash">Numerário</option>
            </select>
          </div>
          <div className="w-1/4 min-w-[120px]">
            <label className="block text-xs font-semibold mb-1">SALDO ACTUAL</label>
            <input name="balance" type="number" step="any" className="input py-2 text-sm" placeholder="Ex: 5000" required />
          </div>
          <button type="submit" className="btn btn-primary py-2 text-sm font-semibold whitespace-nowrap">
            Adicionar Conta
          </button>
        </form>
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
