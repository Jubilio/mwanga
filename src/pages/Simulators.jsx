import { useState, useEffect } from 'react';
import { useFinance } from '../hooks/useFinance';
import { useOutletContext } from 'react-router-dom';
import { Calculator, TrendingUp, RefreshCcw, Wallet, Banknote, BarChart3, Check, Target, Info, Sparkles, Flame } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { fmt, calcCompoundInterest } from '../utils/calculations';
import { motion, AnimatePresence } from 'framer-motion';

// ─── PRO GATE ─────────────────────────────────────────────────────────────
function ProGate({ children, isPro, title = "Funcionalidade Intelligence", description = "Desbloqueie simuladores avançados com o Plano PRO." }) {
  if (isPro) return children;
  return (
    <div style={{ position: "relative", borderRadius: 28, overflow: "hidden" }}>
      <div style={{ filter: "blur(12px)", opacity: 0.25, pointerEvents: "none" }}>
        {children}
      </div>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16, padding: 32,
        background: "rgba(7, 20, 31, 0.7)", backdropFilter: "blur(4px)",
        borderRadius: 28, border: "1px solid rgba(201, 150, 58, 0.3)",
      }}>
        <div style={{ fontSize: 48, filter: 'drop-shadow(0 0 10px rgba(201, 150, 58, 0.4))' }}>👑</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "var(--color-gold)", fontFamily: "Sora, sans-serif", textAlign: "center" }}>{title}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 1.6, maxWidth: 300 }}>{description}</div>
        <a href="/pricing" style={{
          marginTop: 10, padding: "14px 36px", borderRadius: 16,
          textDecoration: "none", fontWeight: 900, fontSize: 13, letterSpacing: '1px', textTransform: 'uppercase',
          background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))", color: "#000", border: 'none',
          boxShadow: '0 10px 25px rgba(201, 150, 58, 0.3)'
        }}>Mudar para PRO →</a>
      </div>
    </div>
  );
}

export default function Simulators() {
  const { state, dispatch } = useFinance();
  const { showToast } = useOutletContext();
  
  // Tabs for the Intelligence 2.0
  const [activeTab, setActiveTab] = useState('budget'); // 'budget', 'invest', 'fire', 'xitique'

  // Standard states
  const [principal, setPrincipal] = useState(50000);
  const [monthly, setMonthly] = useState(10000);
  const [rate, setRate] = useState(12);
  const [years, setYears] = useState(10);

  const [salary, setSalary] = useState(state.settings.user_salary || 50000);
  const [needsPct, setNeedsPct] = useState(50);
  const [wantsPct, setWantsPct] = useState(30);
  const [activeModel, setActiveModel] = useState('50/30/20');
  
  const isPro = state.settings?.plan === 'pro';

  // Sync global salary
  useEffect(() => {
    const globalSalary = state.settings.user_salary;
    if (globalSalary && globalSalary !== salary) setSalary(globalSalary);
  }, [state.settings.user_salary]);

  const updateGlobalSalary = (val) => {
    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'user_salary', value: val } });
  };

  const savingsPct = Math.max(0, 100 - (needsPct + wantsPct));
  const compoundData = calcCompoundInterest(principal, monthly, rate, years);
  const finalBalance = compoundData[compoundData.length - 1]?.balance || 0;
  const totalInvested = compoundData[compoundData.length - 1]?.invested || 0;
  const interestEarned = finalBalance - totalInvested;

  const chartData = compoundData.filter((_, i) => i % 6 === 0 || i === compoundData.length - 1);

  // Tab switcher component
  const Tabs = () => (
    <div style={{ 
      display: 'flex', 
      gap: '8px', 
      marginBottom: '2rem', 
      overflowX: 'auto', 
      paddingBottom: '8px',
      padding: '6px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      {[
        { id: 'budget', label: 'Orçamento', icon: Banknote },
        { id: 'invest', label: 'Investimento', icon: TrendingUp },
        { id: 'fire', label: 'Independência', icon: Flame },
        { id: 'xitique', label: 'Xitique', icon: RefreshCcw }
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '16px',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 800,
            whiteSpace: 'nowrap',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: activeTab === tab.id ? 'var(--color-ocean)' : 'transparent',
            color: activeTab === tab.id ? '#fff' : 'var(--color-muted)',
            boxShadow: activeTab === tab.id ? '0 8px 20px rgba(10, 77, 104, 0.4)' : 'none'
          }}
        >
          <tab.icon size={16} />
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="w-full flex-1 flex flex-col pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-midnight dark:text-white mb-2 font-display">Simuladores</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Mwanga Intelligence 2.0 · Projecções Financeiras de Alta Fidelidade</p>
      </div>

      <Tabs />

      <AnimatePresence mode="wait">
        {activeTab === 'budget' && (
          <motion.div
            key="budget"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Orçamentação Inteligente */}
            <div className="glass-card p-6 rounded-[28px] border border-white/5 shadow-2xl relative overflow-hidden">
               <div style={{ position: 'absolute', top: 12, right: 12, opacity: 0.1 }}>
                  <Banknote size={80} />
               </div>
               
               <h2 className="text-xl font-black text-midnight dark:text-white mb-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ocean/10 flex items-center justify-center text-ocean">
                    <Banknote size={20} />
                  </div>
                  Gestão de Rendimentos
               </h2>

               <div className="grid md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2 block">Salário Mensal (MT)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={salary} 
                          onChange={e => setSalary(Number(e.target.value))}
                          onBlur={e => updateGlobalSalary(Number(e.target.value))}
                          className="w-full bg-black/5 dark:bg-white/5 border-none rounded-2xl p-4 pl-12 text-lg font-black dark:text-white outline-none focus:ring-2 ring-ocean/50 transition-all" 
                        />
                        <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {['50/30/20', '70/20/10', '60/40/0'].map(m => (
                        <button
                          key={m}
                          onClick={() => {
                            const [n, w] = m.split('/').map(Number);
                            setNeedsPct(n);
                            setWantsPct(w);
                            setActiveModel(m);
                          }}
                          className={`px-4 py-2 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all ${activeModel === m ? 'bg-ocean text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 text-gray-400 hover:text-gray-200'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl bg-black/2 dark:bg-white/2 border border-white/5">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-ocean uppercase letter-spacing-1">Necessidades</span>
                        <span className="text-sm font-black dark:text-white">{needsPct}%</span>
                      </div>
                      <input type="range" min="30" max="80" step="5" value={needsPct} onChange={e => {setNeedsPct(Number(e.target.value)); setActiveModel('custom');}} className="w-full accent-ocean" />
                    </div>
                    <div className="p-5 rounded-2xl bg-black/2 dark:bg-white/2 border border-white/5">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-black text-gold uppercase letter-spacing-1">Desejos</span>
                        <span className="text-sm font-black dark:text-white">{wantsPct}%</span>
                      </div>
                      <input type="range" min="0" max="50" step="5" value={wantsPct} onChange={e => {setWantsPct(Number(e.target.value)); setActiveModel('custom');}} className="w-full accent-gold" />
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Essencial', val: salary * (needsPct/100), color: 'var(--color-ocean)', desc: 'Renda, Contas, Comida' },
                    { label: 'Estilo de Vida', val: salary * (wantsPct/100), color: 'var(--color-gold)', desc: 'Lazer, Shopping, Subscrições' },
                    { label: 'Futuro', val: salary * (savingsPct/100), color: 'var(--color-leaf)', desc: 'Poupança, Investimentos' },
                  ].map(stat => (
                    <div key={stat.label} className="p-6 rounded-[24px] bg-black/5 dark:bg-white/5 border border-white/5 relative group hover:bg-black/10 transition-all">
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: stat.color, marginBottom: 12, boxShadow: `0 0 15px ${stat.color}80` }} />
                      <div className="text-[10px] font-black text-gray-400 uppercase mb-1">{stat.label}</div>
                      <div className="text-xl font-black dark:text-white mb-2">MT {fmt(stat.val)}</div>
                      <div className="text-[10px] text-gray-500 italic">{stat.desc}</div>
                    </div>
                  ))}
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'invest' && (
          <motion.div
            key="invest"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Compound Interest */}
            <div className="glass-card p-6 rounded-[28px] border border-white/5 shadow-2xl relative">
              <h2 className="text-xl font-black text-midnight dark:text-white mb-8 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-leaf/10 flex items-center justify-center text-leaf">
                    <TrendingUp size={20} />
                  </div>
                  Poder dos Juros Compostos
               </h2>

               <div className="grid md:grid-cols-4 gap-4 mb-8">
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase mb-2 block">Inicial (MT)</label>
                    <input type="number" value={principal} onChange={e => setPrincipal(Number(e.target.value))} className="w-full bg-white/5 p-3 rounded-xl dark:text-white font-bold border-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase mb-2 block">Mensal (MT)</label>
                    <input type="number" value={monthly} onChange={e => setMonthly(Number(e.target.value))} className="w-full bg-white/5 p-3 rounded-xl dark:text-white font-bold border-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase mb-2 block">Taxa (%)</label>
                    <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} className="w-full bg-white/5 p-3 rounded-xl dark:text-white font-bold border-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase mb-2 block">Anos</label>
                    <input type="number" value={years} onChange={e => setYears(Number(e.target.value))} className="w-full bg-white/5 p-3 rounded-xl dark:text-white font-bold border-none" />
                  </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center p-6 bg-ocean/5 rounded-2xl border border-ocean/10">
                    <div className="text-[11px] font-black text-ocean uppercase mb-1">Resultado Final</div>
                    <div className="text-2xl font-black dark:text-white">MT {fmt(finalBalance)}</div>
                  </div>
                  <div className="text-center p-6 bg-leaf/5 rounded-2xl border border-leaf/10">
                    <div className="text-[11px] font-black text-leaf uppercase mb-1">Total Investido</div>
                    <div className="text-2xl font-black dark:text-white">MT {fmt(totalInvested)}</div>
                  </div>
                  <div className="text-center p-6 bg-gold/5 rounded-2xl border border-gold/10 col-span-2 md:col-span-1">
                    <div className="text-[11px] font-black text-gold uppercase mb-1">Riqueza Gerada</div>
                    <div className="text-2xl font-black dark:text-white">MT {fmt(interestEarned)}</div>
                  </div>
               </div>

               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-ocean)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--color-ocean)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7fa3' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7fa3' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <RTooltip 
                        contentStyle={{ background: '#0c1c2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                        labelStyle={{ fontWeight: 900, color: '#fff', marginBottom: '8px' }}
                      />
                      <Area type="monotone" dataKey="balance" name="Património" stroke="var(--color-ocean)" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'fire' && (
          <motion.div
            key="fire"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ProGate isPro={isPro} title="Simulador de Independência Financeira" description="Calcula exactamente quanto dinheiro precisas de ter investido para nunca mais teres de trabalhar.">
              <div className="glass-card p-6 rounded-[28px] border border-white/5 shadow-2xl">
                <h2 className="text-xl font-black text-midnight dark:text-white mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                      <Flame size={20} />
                    </div>
                    Caminho para o FIRE
                </h2>

                <div className="grid md:grid-cols-3 gap-8 items-center">
                   <div className="space-y-6">
                      <div>
                        <label className="text-[11px] font-black text-muted mb-2 block">Gasto Mensal Desejado (MT)</label>
                        <input type="number" value={monthly} onChange={e => setMonthly(Number(e.target.value))} className="w-full bg-white/5 p-4 rounded-2xl dark:text-white font-black text-xl border-none outline-none focus:ring-1 ring-gold/40" />
                      </div>
                      <div className="p-6 rounded-2xl bg-gold/5 border border-gold/10 text-center">
                        <div className="text-[10px] font-black text-gold uppercase mb-1 tracking-widest">O Teu Número de Independência</div>
                        <div className="text-4xl font-black dark:text-white font-display">MT {fmt(monthly * 12 * 25)}</div>
                        <p className="text-[10px] text-gray-500 mt-4 italic">Baseado na regra dos 4%. Este capital gera MT {fmt(monthly)}/mês eternamente.</p>
                      </div>
                   </div>

                   <div className="md:col-span-2 p-8 bg-black/10 rounded-[32px] border border-white/5 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                        <Target size={120} />
                      </div>
                      
                      <div className="flex items-center gap-4 mb-8">
                        <Sparkles className="text-gold" size={24} />
                        <div>
                          <h3 className="text-lg font-black dark:text-white">Binth Intelligence Insight</h3>
                          <p className="text-xs text-gray-400">Projecção para o mercado de Moçambique</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-gray-300">Progresso Actual</span>
                          <span className="text-sm font-black text-gold">2% do Alvo</span>
                        </div>
                        <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-gold to-gold-light" style={{ width: '2%' }} />
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                          Para atingires a reforma antecipada em 15 anos, precisas de investir <strong>MT 15.420</strong> adicionais todos os meses a uma taxa de 12% anuais. 
                          <em> O sábio constrói a sua casa antes do inverno chegar.</em>
                        </p>
                      </div>
                   </div>
                </div>
              </div>
            </ProGate>
          </motion.div>
        )}

        {activeTab === 'xitique' && (
          <motion.div
            key="xitique"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
             <div className="glass-card p-6 rounded-[28px] border border-white/5 shadow-2xl">
                <h2 className="text-xl font-black text-midnight dark:text-white mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky/10 flex items-center justify-center text-sky">
                      <RefreshCcw size={20} />
                    </div>
                    Vantagem do Xitique Inteligente
                </h2>

                <div className="grid md:grid-cols-2 gap-12">
                   <div className="space-y-6">
                      <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <label className="text-[11px] font-black text-muted mb-4 block uppercase tracking-wider">Configurar Círculo</label>
                        <div className="space-y-6">
                          <div>
                            <div className="flex justify-between text-xs mb-2">
                              <span className="text-gray-400">Contribuição Mensal</span>
                              <span className="text-white font-bold">MT 5.000</span>
                            </div>
                            <input type="range" min="1000" max="20000" step="1000" className="w-full accent-sky" />
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-2">
                              <span className="text-gray-400">Participantes</span>
                              <span className="text-white font-bold">10 pessoas</span>
                            </div>
                            <input type="range" min="2" max="24" className="w-full accent-sky" />
                          </div>
                        </div>
                      </div>
                   </div>

                   <div className="flex flex-col justify-center gap-6">
                     <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-ocean/20 flex items-center justify-center text-ocean shrink-0">
                          <Check size={24} />
                        </div>
                        <div>
                          <div className="text-lg font-black dark:text-white">Juro Zero Real</div>
                          <p className="text-sm text-gray-500">Ao contrário de um banco (26% AA), o Xitique é um empréstimo de custo zero se fores dos primeiros a receber.</p>
                        </div>
                     </div>
                     <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center text-gold shrink-0">
                          <Info size={24} />
                        </div>
                        <div>
                          <div className="text-lg font-black dark:text-white">Alavancagem Gratuita</div>
                          <p className="text-sm text-gray-500">Receber MT 50.000 no primeiro mês é uma ferramenta potente de investimento imediato.</p>
                        </div>
                     </div>
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Warning */}
      <div className="mt-8 p-6 rounded-[28px] bg-amber-500/5 border border-amber-500/10 flex gap-4">
          <Info className="text-amber-500 shrink-0" size={24} />
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            As simulações apresentadas são baseadas em modelos matemáticos e taxas de mercado actuais em Moçambique (Prime Rate 23.10%). Os resultados são projecções e não garantias de retorno ou aprovação de crédito. 
            <strong className="text-amber-500/80"> Mwanga Intelligence recomenda consulta com um consultor profissional antes de decisões críticas.</strong>
          </p>
      </div>
    </div>
  );
}
