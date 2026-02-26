import { useState, useEffect } from 'react';
import { useFinance } from '../hooks/useFinanceStore';
import { useOutletContext } from 'react-router-dom';
import { Calculator, TrendingUp, RefreshCcw, Wallet, Banknote, BarChart3, Check, Target } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { fmt, calcCompoundInterest } from '../utils/calculations';

export default function Simulators() {
  const { state, dispatch } = useFinance();
  const { showToast } = useOutletContext();
  const [principal, setPrincipal] = useState(50000);
  const [monthly, setMonthly] = useState(10000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);

  const [landPrice, setLandPrice] = useState(500000);
  const [landSaved, setLandSaved] = useState(80000);
  const [landMonthly, setLandMonthly] = useState(15000);

  const [xitiqueAmount, setXitiqueAmount] = useState(10000);
  const [xitiqueParticipants, setXitiqueParticipants] = useState(5);
  const [xitiquePos, setXitiquePos] = useState(1);

  const [salary, setSalary] = useState(state.settings.user_salary || 50000);
  const [needsPct, setNeedsPct] = useState(50);
  const [wantsPct, setWantsPct] = useState(30);
  const [activeModel, setActiveModel] = useState('50/30/20');
  const [actualSpending, setActualSpending] = useState({ needs: 0, wants: 0, savings: 0 });

  // Sync global salary only when settings are loaded or changed externally
  useEffect(() => {
    const globalSalary = state.settings.user_salary;
    if (globalSalary && globalSalary !== salary) {
      setSalary(globalSalary);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings.user_salary]);

  const updateGlobalSalary = (val) => {
    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'user_salary', value: val } });
  };

  const savingsPct = Math.max(0, 100 - (needsPct + wantsPct));

  const compoundData = calcCompoundInterest(principal, monthly, rate, years);
  const finalBalance = compoundData[compoundData.length - 1]?.balance || 0;
  const totalInvested = compoundData[compoundData.length - 1]?.invested || 0;
  const interestEarned = finalBalance - totalInvested;

  // Show every 12th data point for cleaner charts
  const chartData = compoundData.filter((_, i) => i % 6 === 0 || i === compoundData.length - 1);

  // Land simulator
  const landRemaining = Math.max(0, landPrice - landSaved);
  const landMonths = landMonthly > 0 ? Math.ceil(landRemaining / landMonthly) : 0;
  const landYears = (landMonths / 12).toFixed(1);

  // Models Mapping
  const models = {
    '50/30/20': { needs: 50, wants: 30, desc: 'Equilibrado (Padrão)' },
    '70/20/10': { needs: 70, wants: 20, desc: 'Conservador (Foco no Essencial)' },
    '60/40/0': { needs: 60, wants: 40, desc: 'Simples (Sem foco em Poupança)' },
    'custom': { needs: needsPct, wants: wantsPct, desc: 'Personalizado por si' },
  };

  function applyModel(key) {
    if (key === 'adaptive') {
      // Logic for adaptive analysis
      const now = new Date();
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30)).toISOString().slice(0, 10);
      const recentTx = state.transacoes.filter(t => t.data >= thirtyDaysAgo);
      
      const total = recentTx.reduce((s, t) => s + t.valor, 0) || 1;
      const needsVal = recentTx.filter(t => ['Renda', 'Alimentação', 'Transporte', 'Saúde'].includes(t.cat)).reduce((s, t) => s + t.valor, 0);
      const wantsVal = recentTx.filter(t => ['Lazer', 'Outros'].includes(t.cat)).reduce((s, t) => s + t.valor, 0);
      const savingsVal = recentTx.filter(t => t.cat === 'Poupanca' || t.cat === 'Xitique').reduce((s, t) => s + t.valor, 0);

      const nP = Math.round((needsVal / total) * 100);
      const wP = Math.round((wantsVal / total) * 100);
      
      setNeedsPct(nP);
      setWantsPct(wP);
      setActualSpending({ needs: needsVal, wants: wantsVal, savings: savingsVal });
      setActiveModel('adaptive');
      showToast('🤖 Modelo Adaptativo aplicado com base no seu gasto real!');
    } else {
      setNeedsPct(models[key].needs);
      setWantsPct(models[key].wants);
      setActiveModel(key);
    }
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      {/* Salary Management Planner */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="section-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Banknote size={18} /> Orçamentação Inteligente
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {['50/30/20', '70/20/10', '60/40/0', 'adaptive'].map(m => (
            <button 
              key={m} 
              onClick={() => applyModel(m)}
              className={`btn ${activeModel === m ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
            >
              {m === 'adaptive' ? '🤖 Modo Adaptativo' : m}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: '300px', flex: 1 }}>
            <label className="form-label">Seu Salário Mensal (MT)</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="number" className="form-input" value={salary} 
                onChange={e => setSalary(parseFloat(e.target.value) || 0)} 
                onBlur={e => updateGlobalSalary(parseFloat(e.target.value) || 0)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>MT</span>
            </div>
          </div>
          <button 
            className="btn btn-leaf" 
            style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => {
              dispatch({ 
                type: 'APPLY_SALARY_BUDGET', 
                payload: { 
                  needs: salary * (needsPct / 100), 
                  wants: salary * (wantsPct / 100), 
                  savings: salary * (savingsPct / 100) 
                } 
              });
              showToast('✅ Limites aplicados ao orçamento mensal!');
            }}
          >
            <Check size={18} /> Aplicar como Orçamento
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Necessidades</label>
              <span style={{ fontWeight: 600, color: 'var(--color-ocean)' }}>{needsPct}%</span>
            </div>
            <input type="range" min="10" max="80" step="5" value={needsPct} onChange={e => { setNeedsPct(parseInt(e.target.value)); setActiveModel('custom'); }} style={{ width: '100%', accentColor: 'var(--color-ocean)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Desejos</label>
              <span style={{ fontWeight: 600, color: 'var(--color-gold)' }}>{wantsPct}%</span>
            </div>
            <input type="range" min="0" max="60" step="5" value={wantsPct} onChange={e => { setWantsPct(parseInt(e.target.value)); setActiveModel('custom'); }} style={{ width: '100%', accentColor: 'var(--color-gold)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Poupança (Restante)</label>
              <span style={{ fontWeight: 600, color: 'var(--color-leaf)' }}>{savingsPct}%</span>
            </div>
            <div className="progress-bar-track" style={{ height: '8px', marginTop: '8px' }}>
              <div className="progress-bar-fill" style={{ width: `${savingsPct}%`, background: 'var(--color-leaf)' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {/* Needs */}
          <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', borderLeft: '4px solid var(--color-ocean)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600 }}>Necessidades ({needsPct}%)</span>
              <span style={{ color: 'var(--color-ocean)', fontWeight: 700 }}>{fmt(salary * (needsPct / 100))}</span>
            </div>
            {activeModel === 'adaptive' && (
              <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
                Real (30d): <strong style={{color:'var(--color-ocean)'}}>{fmt(actualSpending.needs)}</strong>
              </div>
            )}
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>Despesas essenciais para viver e trabalhar.</p>
            <ul style={{ fontSize: '0.8rem', paddingLeft: '1.2rem', color: 'var(--color-muted)' }}>
              <li>Renda e Serviços (Água/Luz)</li>
              <li>Alimentação e Transporte</li>
              <li>Seguro e Saúde</li>
            </ul>
          </div>

          {/* Wants */}
          <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', borderLeft: '4px solid var(--color-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600 }}>Desejos ({wantsPct}%)</span>
              <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>{fmt(salary * (wantsPct / 100))}</span>
            </div>
            {activeModel === 'adaptive' && (
              <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
                Real (30d): <strong style={{color:'var(--color-gold)'}}>{fmt(actualSpending.wants)}</strong>
              </div>
            )}
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>Gastos flexíveis que melhoram sua qualidade de vida.</p>
            <ul style={{ fontSize: '0.8rem', paddingLeft: '1.2rem', color: 'var(--color-muted)' }}>
              <li>Refeições fora e Lazer</li>
              <li>Subscrições (Netflix/Gym)</li>
              <li>Shopping e Hobbies</li>
            </ul>
          </div>

          {/* Savings */}
          <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', borderLeft: '4px solid var(--color-leaf)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 600 }}>Poupança/Dívida ({savingsPct}%)</span>
              <span style={{ color: 'var(--color-leaf)', fontWeight: 700 }}>{fmt(salary * (savingsPct / 100))}</span>
            </div>
            {activeModel === 'adaptive' && (
              <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
                Real (30d): <strong style={{color:'var(--color-leaf)'}}>{fmt(actualSpending.savings)}</strong>
              </div>
            )}
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>Construção de património e segurança futura.</p>
            <ul style={{ fontSize: '0.8rem', paddingLeft: '1.2rem', color: 'var(--color-muted)' }}>
              <li>Fundo de Emergência</li>
              <li>Investimentos e Xitique</li>
              <li>Amortização de Dívidas</li>
            </ul>
          </div>
        </div>

        {/* Insight Section */}
        {activeModel !== 'custom' && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            background: 'linear-gradient(135deg, rgba(10, 77, 104, 0.05), rgba(61, 107, 69, 0.05))',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', color: 'var(--color-ocean)', fontWeight: 600 }}>
              <BarChart3 size={18} /> Mwanga Insight
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', lineHeight: '1.6' }}>
              {activeModel === 'adaptive' ? (
                "Este modelo reflete exatamente como você usou seu dinheiro nos últimos 30 dias. Use-o como base para um orçamento realista em vez de um ideal teórico."
              ) : (
                `O modelo **${activeModel}** é focado em **${models[activeModel].desc}**. Compare estes valores com o seu histórico real para ajustar a sua disciplina financeira.`
              )}
            </p>
          </div>
        )}
      </div>

      {/* Compound Interest Simulator */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="section-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calculator size={18} /> Simulador de Juros Compostos
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div>
            <label className="form-label">Capital Inicial (MT)</label>
            <input
              type="number" className="form-input" value={principal}
              onChange={e => setPrincipal(parseFloat(e.target.value) || 0)} min="0"
            />
          </div>
          <div>
            <label className="form-label">Contribuição Mensal (MT)</label>
            <input
              type="number" className="form-input" value={monthly}
              onChange={e => setMonthly(parseFloat(e.target.value) || 0)} min="0"
            />
          </div>
          <div>
            <label className="form-label">Taxa Anual (%)</label>
            <input
              type="number" className="form-input" value={rate}
              onChange={e => setRate(parseFloat(e.target.value) || 0)} min="0" step="0.5"
            />
          </div>
          <div>
            <label className="form-label">Período (Anos)</label>
            <input
              type="number" className="form-input" value={years}
              onChange={e => setYears(parseInt(e.target.value) || 1)} min="1" max="40"
            />
          </div>
        </div>

        {/* Results */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{
            background: 'rgba(10, 77, 104, 0.06)',
            borderRadius: '14px',
            padding: '1rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
              Saldo Final
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-ocean)' }}>
              {fmt(finalBalance)}
            </div>
          </div>
          <div style={{
            background: 'rgba(61, 107, 69, 0.06)',
            borderRadius: '14px',
            padding: '1rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
              Total Investido
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-leaf)' }}>
              {fmt(totalInvested)}
            </div>
          </div>
          <div style={{
            background: 'rgba(201, 150, 58, 0.06)',
            borderRadius: '14px',
            padding: '1rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
              Juros Ganhos
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-gold)' }}>
              {fmt(interestEarned)}
            </div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="cBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0a4d68" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#0a4d68" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cInvested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3d6b45" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3d6b45" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} label={{ value: 'Anos', position: 'insideBottom', offset: -5, fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <RTooltip formatter={v => fmt(v)} labelFormatter={y => `Ano ${y}`} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '0.78rem' }} />
            <Area type="monotone" dataKey="balance" name="Saldo Total" stroke="#0a4d68" fill="url(#cBalance)" strokeWidth={2.5} />
            <Area type="monotone" dataKey="invested" name="Investido" stroke="#3d6b45" fill="url(#cInvested)" strokeWidth={2} strokeDasharray="5 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Land / House Purchase Simulator */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div className="section-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} /> Simulador de Compra (Terreno / Casa)
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div>
            <label className="form-label">Preço do Terreno/Casa (MT)</label>
            <input type="number" className="form-input" value={landPrice} onChange={e => setLandPrice(parseFloat(e.target.value) || 0)} min="0" />
          </div>
          <div>
            <label className="form-label">Já Poupado (MT)</label>
            <input type="number" className="form-input" value={landSaved} onChange={e => setLandSaved(parseFloat(e.target.value) || 0)} min="0" />
          </div>
          <div>
            <label className="form-label">Poupança Mensal (MT)</label>
            <input type="number" className="form-input" value={landMonthly} onChange={e => setLandMonthly(parseFloat(e.target.value) || 0)} min="0" />
          </div>
        </div>

        {/* Result */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(10, 77, 104, 0.06), rgba(26, 143, 168, 0.06))',
          borderRadius: '16px',
          padding: '1.5rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
            Com poupança mensal de <strong>{fmt(landMonthly)}</strong>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--color-ocean)', marginBottom: '0.3rem' }}>
            {landMonths} meses
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            (~{landYears} anos) para alcançar {fmt(landPrice)}
          </div>

          {/* Progress */}
          <div style={{ maxWidth: '400px', margin: '1.25rem auto 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-muted)', marginBottom: '0.3rem' }}>
              <span>{fmt(landSaved)} poupados</span>
              <span>{Math.round((landSaved / landPrice) * 100)}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{
                width: `${Math.min(100, (landSaved / landPrice) * 100)}%`,
                background: 'linear-gradient(90deg, var(--color-ocean), var(--color-sky))',
              }} />
            </div>
            <div style={{ fontSize: '0.73rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>
              Faltam: {fmt(landRemaining)}
            </div>
          </div>
        </div>
      </div>

      {/* Xitique Advantage Simulator */}
      <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <div className="section-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCcw size={18} /> Simulador de Vantagem Xitique
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div>
            <label className="form-label">Valor Mensal (MT)</label>
            <input type="number" className="form-input" value={xitiqueAmount} onChange={e => setXitiqueAmount(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="form-label">Nº de Participantes</label>
            <input type="number" className="form-input" value={xitiqueParticipants} onChange={e => setXitiqueParticipants(parseInt(e.target.value) || 2)} />
          </div>
          <div>
            <label className="form-label">Sua Posição</label>
            <input type="number" className="form-input" min="1" max={xitiqueParticipants} value={xitiquePos} onChange={e => setXitiquePos(parseInt(e.target.value) || 1)} />
          </div>
        </div>

        {/* Xitique Logic Results */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(201, 150, 58, 0.06), rgba(255, 213, 79, 0.06))',
          borderRadius: '16px',
          padding: '1.5rem',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>Total a Receber</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gold)' }}>{fmt(xitiqueAmount * xitiqueParticipants)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>Índice de Vantagem</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: xitiquePos <= xitiqueParticipants / 2 ? 'var(--color-leaf)' : 'var(--color-ocean)' }}>
                {((xitiqueParticipants - xitiquePos + 1) / xitiqueParticipants * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', lineHeight: '1.5', maxWidth: '600px', margin: '0 auto' }}>
            {xitiquePos === 1 ? (
              "🌟 **Vantagem Máxima!** Você recebe o montante total logo no primeiro mês. É como um empréstimo sem juros para investimento imediato."
            ) : xitiquePos <= xitiqueParticipants / 2 ? (
              "✅ **Alta Liquidez.** Você recebe antes da metade do ciclo, permitindo antecipar compras ou investimentos sem pagar juros bancários."
            ) : (
              "🛡️ **Poupança Forçada.** Você recebe na segunda metade do ciclo. Funciona como um excelente mecanismo para disciplina financeira e metas de médio prazo."
            )}
          </p>

          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--color-ocean)', fontSize: '0.82rem' }}>
            <Wallet size={14} /> 
            <span>Equivalente a poupar <strong>{fmt(xitiqueAmount)}</strong> por mês durante <strong>{xitiqueParticipants} meses</strong>.</span>
          </div>
        </div>
      </div>
      {/* Retirement Planner (Advanced) */}
      <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <div className="section-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={18} /> Planejador de Reforma (FIRE)
          </span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label className="form-label text-[10px]">Gasto Mensal Desejado (MT)</label>
            <input type="number" className="form-input" value={monthly} onChange={e => setMonthly(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label className="form-label text-[10px]">Inflação Estimada (% Anual)</label>
            <input type="number" className="form-input" defaultValue={5} step="0.5" />
          </div>
          <div>
            <label className="form-label text-[10px]">Idade Atual</label>
            <input type="number" className="form-input" defaultValue={30} />
          </div>
          <div>
            <label className="form-label text-[10px]">Idade de Reforma</label>
            <input type="number" className="form-input" defaultValue={60} />
          </div>
        </div>

        <div style={{ background: 'rgba(201, 150, 58, 0.05)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(201, 150, 58, 0.1)' }}>
          <div className="text-center mb-6">
            <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Seu Número de Independência Financeira</div>
            <div className="text-3xl font-black text-gold-deep">{fmt(monthly * 12 * 25)}</div>
            <p className="text-[10px] text-muted mt-2">Baseado na Regra dos 4% (25x seu gasto anual)</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="text-[10px] text-muted mb-1">Património Ajustado (30 anos)</div>
              <div className="text-sm font-bold text-gray-200">{fmt(monthly * 12 * 25 * Math.pow(1.05, 30))}</div>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="text-[10px] text-muted mb-1">Poupança Mensal Necessária</div>
              <div className="text-sm font-bold text-ocean">{fmt(25000)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Risk/Return Simulator */}
      <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
        <div className="section-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={18} /> Simulador de Alocação de Carteira
          </span>
        </div>
        
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['Conservador', 'Moderado', 'Agressivo'].map((p) => (
            <button key={p} className={`btn btn-sm ${p === 'Moderado' ? 'btn-primary' : 'btn-ghost'}`}>{p}</button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="h-48">
            <ResponsiveContainer width="100%" height={192}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Ações', value: 60, color: 'var(--color-ocean)' },
                    { name: 'Obrigações', value: 30, color: 'var(--color-leaf)' },
                    { name: 'Cash', value: 10, color: 'var(--color-gold)' },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="var(--color-ocean)" />
                  <Cell fill="var(--color-leaf)" />
                  <Cell fill="var(--color-gold)" />
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">Retorno Esperado</span>
                <span className="font-bold text-leaf">~12% aa</span>
              </div>
              <div className="h-1 bg-black/10 rounded-full overflow-hidden">
                <div className="h-full bg-leaf w-[70%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted">Risco (Volatilidade)</span>
                <span className="font-bold text-coral">Média-Alta</span>
              </div>
              <div className="h-1 bg-black/10 rounded-full overflow-hidden">
                <div className="h-full bg-coral w-[40%]" />
              </div>
            </div>
            <p className="text-[10px] text-muted italic">
              "Uma carteira moderada equilibra o crescimento global com a estabilidade de ativos locais em Moçambique."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
