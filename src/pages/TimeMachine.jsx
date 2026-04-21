import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import { fmt, calcMonthlyTotals, getFinancialMonthKey } from '../utils/calculations';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, TrendingDown, Target, Brain, AlertTriangle, Sparkles } from 'lucide-react';

export default function TimeMachine() {
  const { t } = useTranslation();
  const { state } = useFinance();
  const [years, setYears] = useState(5);
  const [returnRate, setReturnRate] = useState(8); 
  const [incomeMonths, setIncomeMonths] = useState(120);
  const [showBalance] = useState(() => localStorage.getItem('mwanga-show-balance') !== 'false');
  
  const currency = state.settings.currency || 'MT';
  const currentNetWorth = state.contas?.reduce((acc, c) => acc + Number(c.current_balance || 0), 0) + Number(state.settings.cash_balance || 0);

  const projectionData = useMemo(() => {
    const monthKey = getFinancialMonthKey(new Date(), state.settings.financial_month_start_day || 1);
    const totals = calcMonthlyTotals(state.transacoes, monthKey, state.rendas, state.settings.financial_month_start_day || 1);
    
    const monthlySaving = totals.totalIncome - totals.totalExpenses;
    const monthlyIncome = totals.totalIncome;
    const monthlyExpense = totals.totalExpenses;
    
    const data = [];
    let projectedBalance = currentNetWorth;
    
    for (let i = 0; i <= years * 12; i++) {
      if (i > 0) {
        const currentSaving = i <= incomeMonths ? monthlySaving : -monthlyExpense;
        const monthlyReturn = 1 + (returnRate / 100 / 12);
        projectedBalance = (projectedBalance + currentSaving) * monthlyReturn;
      }
      
      if (i % 12 === 0) {
        data.push({
          year: i / 12,
          balance: projectedBalance,
        });
      }
    }
    return { data, monthlySaving };
  }, [state, currentNetWorth, years, returnRate, incomeMonths]);

  const finalBalance = projectionData.data[projectionData.data.length - 1].balance;
  const isPositive = finalBalance > currentNetWorth;

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-7xl mx-auto w-full">
      <style>{`
        .time-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          background: #7C3AED;
          border: 4px solid #fff;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(124, 58, 237, 0.5);
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/20">
            <Clock size={28} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black dark:text-white tracking-tighter">Máquina do Tempo</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Simulação de Futuro Financeiro</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
        
        {/* Controls Card */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass-card p-6 space-y-8">
            <div>
              <div className="flex justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Horizonte Temporal</span>
                <span className="text-lg font-black text-indigo-500">{years} Anos</span>
              </div>
              <input type="range" min="1" max="40" value={years} onChange={(e) => setYears(parseInt(e.target.value))} className="time-slider w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer" />
            </div>

            <div>
              <div className="flex justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Retorno Anual (ROI)</span>
                <span className="text-lg font-black text-emerald-500">{returnRate}%</span>
              </div>
              <input type="range" min="0" max="25" value={returnRate} onChange={(e) => setReturnRate(parseInt(e.target.value))} className="time-slider w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer" />
              <p className="mt-2 text-[10px] text-gray-500 leading-relaxed italic">
                *Assume que investes a tua poupança mensal
              </p>
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="flex justify-between mb-4">
                <div className="flex flex-col">
                  <span className="text-xs font-black uppercase tracking-widest text-white">Duração do Contrato</span>
                  <span className="text-[10px] text-gray-400 font-bold">Meses com Salário Fixo</span>
                </div>
                <span className="text-lg font-black text-amber-500">{incomeMonths >= 120 ? 'Vitalício' : `${incomeMonths} Meses`}</span>
              </div>
              <input type="range" min="6" max="120" step="6" value={incomeMonths} onChange={(e) => setIncomeMonths(parseInt(e.target.value))} className="time-slider w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>

          <div className="glass-card p-6 border-indigo-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Brain size={20} className="text-indigo-400" />
              <span className="text-xs font-black uppercase tracking-widest text-white">Veredicto da Binth</span>
            </div>
            <div className="space-y-4">
              {finalBalance < 0 ? (
                <div className="p-4 rounded-2xl bg-coral/10 border border-coral/20">
                  <div className="flex items-center gap-2 text-coral mb-2"><AlertTriangle size={16} /><span className="text-xs font-black uppercase">Alerta Vermelho</span></div>
                  <p className="text-xs text-coral-light leading-relaxed">A este ritmo, em {years} anos estarás numa situação de dívida acumulada.</p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-indigo-400 mb-2"><Target size={16} /><span className="text-xs font-black uppercase">Crescimento</span></div>
                  <p className="text-xs text-gray-300 leading-relaxed">Estás num caminho {isPositive ? 'seguro' : 'que precisa de atenção'}. Ajusta as tuas poupanças para acelerar.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visualization Card */}
        <div className="lg:col-span-2 xl:col-span-3">
          <div className="glass-card p-4 sm:p-8 h-full flex flex-col relative">
            <div className="absolute inset-0 opacity-10 pointer-events-none rounded-3xl" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

            <div className="flex flex-col items-center mb-12">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2">Património Estimado em {new Date().getFullYear() + years}</span>
              <motion.span key={finalBalance} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`text-3xl sm:text-5xl font-black tabular-nums tracking-tighter ${isPositive ? 'text-white' : 'text-coral'}`}>
                {showBalance ? fmt(finalBalance, currency) : '••••'}
              </motion.span>
            </div>

            <div className="flex-1 min-h-[300px] flex items-center gap-1 relative border-b border-white/10 mb-8">
              <div className="absolute left-0 right-0 h-px bg-white/20 z-10" style={{ top: '50%' }} />
              {projectionData.data.map((point, idx) => {
                const max = Math.max(...projectionData.data.map(d => Math.abs(d.balance)), 1);
                const height = (Math.abs(point.balance) / max) * 50;
                const isNeg = point.balance < 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full">
                    <div className="flex-1 w-full flex flex-col">
                       <div className="flex-1 flex flex-col justify-end">
                          {!isNeg && <motion.div initial={{ height: 0 }} animate={{ height: `${height * 2}%` }} className="w-full rounded-t-lg bg-linear-to-t from-indigo-500 to-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all group-hover:brightness-125" />}
                       </div>
                       <div className="flex-1 flex flex-col justify-start">
                          {isNeg && <motion.div initial={{ height: 0 }} animate={{ height: `${height * 2}%` }} className="w-full rounded-b-lg bg-linear-to-b from-coral to-transparent transition-all group-hover:brightness-125" />}
                       </div>
                    </div>
                    {idx % (years > 10 ? 5 : 1) === 0 && <span className="absolute -bottom-6 text-[9px] font-black text-gray-500 uppercase">{new Date().getFullYear() + point.year}</span>}
                    <div className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-midnight border border-white/10 p-2 rounded-lg z-20 pointer-events-none whitespace-nowrap">
                       <p className="text-[10px] font-black text-white">{showBalance ? fmt(point.balance, currency) : '••••'}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 flex justify-between border-t border-white/5 pt-6">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Património Hoje</span>
                  <span className="text-lg font-black text-white">{showBalance ? fmt(currentNetWorth, currency) : '••••'}</span>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Ganho Estimado</span>
                  <span className="text-lg font-black text-emerald-400">
                    {showBalance ? `${finalBalance > currentNetWorth ? '+' : ''}${fmt(finalBalance - currentNetWorth, currency)}` : '••••'}
                  </span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
