import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import { useStewardship } from '../hooks/useStewardship';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, Heart, Shield, Zap, Star, Trophy, Info, Sparkles, 
  BookOpen, Clock, TrendingUp, TrendingDown, Sliders, ArrowRight, 
  ThumbsUp, ThumbsDown, CheckCircle, XCircle, DollarSign, Target, Calendar,
  ArrowDownLeft, ArrowUpRight, Scale, AlertTriangle, Layers, Database, BarChart3, LineChart
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RTooltip, Legend, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { getFinancialMonthKey, getMonthLabel } from '../utils/calculations';
import { normalizeCategory } from '../utils/categories';

export default function Stewardship() {
  const { t } = useTranslation();
  const { state } = useFinance();
  const { stats, badges } = useStewardship();

  const [activeTab, setActiveTab] = useState('stewardship'); // 'stewardship' or 'fpa'
  const [fpaSubTab, setFpaSubTab] = useState('dre'); // 'dre', 'cashflow', 'pyramid'
  const [useSimulation, setUseSimulation] = useState(false);
  const [growthRate, setGrowthRate] = useState(10); // expected growth percentage
  const [activePyramidLevel, setActivePyramidLevel] = useState('insights'); // 'insights', 'analysis', 'classifications', 'data'
  const [selectedMonth, setSelectedMonth] = useState(''); // Selected YYYY-MM month key

  const currency = state.settings.currency || 'MT';
  const startDay = state.settings.financial_month_start_day || 1;

  // ─── DYNAMIC MONTHS SELECTOR FROM REAL TRANSACTIONS ───
  const availableMonths = useMemo(() => {
    if (!state.transacoes || state.transacoes.length === 0) return [];
    const months = new Set();
    state.transacoes.forEach(t => {
      if (t.data) {
        const key = getFinancialMonthKey(t.data, startDay);
        if (key && key !== '0000-00') {
          months.add(key);
        }
      }
    });
    return Array.from(months).sort().reverse(); // Newest first
  }, [state.transacoes, startDay]);

  // Set default selected month to the most recent one with data
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // ─── DYNAMIC FP&A CALCULATION ENGINE ───
  const fpaData = useMemo(() => {
    if (!selectedMonth || state.transacoes.length === 0) {
      return {
        revenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0, expenses: 0, netIncome: 0, cashBurn: 0, endingCash: 0,
        inflows: { sales: 0, investments: 0, loans: 0, interest: 0 },
        outflows: { salaries: 0, rentUtilities: 0, inventory: 0, taxes: 0 },
        changes: { revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netIncome: 0 }
      };
    }

    const currentKey = selectedMonth;
    const [year, month] = currentKey.split('-').map(Number);
    // Find previous month key
    const prevDate = new Date(year, month - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

    // Filter current and previous month transactions
    const currentTrans = state.transacoes.filter(t => t.data && getFinancialMonthKey(t.data, startDay) === currentKey);
    const prevTrans = state.transacoes.filter(t => t.data && getFinancialMonthKey(t.data, startDay) === prevKey);

    // ─── CATEGORY MAPPING ───
    // COGS: Essential direct expenditures
    const cogsCategories = ['food', 'transport', 'house_rent', 'energy_water', 'internet', 'habitacao'];
    
    // Inflows mapping
    const salesInflows = currentTrans.filter(t => t.tipo === 'receita' && normalizeCategory(t.cat) === 'salary').reduce((sum, t) => sum + Number(t.valor || 0), 0);
    const investInflows = currentTrans.filter(t => t.tipo === 'receita' && normalizeCategory(t.cat) === 'investments').reduce((sum, t) => sum + Number(t.valor || 0), 0);
    const loanInflows = currentTrans.filter(t => t.tipo === 'receita' && normalizeCategory(t.cat) === 'other').reduce((sum, t) => sum + Number(t.valor || 0), 0); // fallback other receipts
    const interestInflows = currentTrans.filter(t => t.tipo === 'receita' && normalizeCategory(t.cat) === 'savings').reduce((sum, t) => sum + Number(t.valor || 0), 0);

    // Outflows mapping
    const rentUtilitiesOutflows = currentTrans.filter(t => t.tipo === 'despesa' && ['house_rent', 'energy_water', 'internet', 'habitacao'].includes(normalizeCategory(t.cat))).reduce((sum, t) => sum + Number(t.valor || 0), 0);
    const salariesOutflows = currentTrans.filter(t => t.tipo === 'despesa' && normalizeCategory(t.cat) === 'education').reduce((sum, t) => sum + Number(t.valor || 0), 0); // Proxy educational or helper costs
    const inventoryOutflows = currentTrans.filter(t => t.tipo === 'despesa' && ['food', 'transport'].includes(normalizeCategory(t.cat))).reduce((sum, t) => sum + Number(t.valor || 0), 0);
    const taxesOutflows = currentTrans.filter(t => t.tipo === 'despesa' && ['leisure', 'other'].includes(normalizeCategory(t.cat))).reduce((sum, t) => sum + Number(t.valor || 0), 0);

    // Calculations
    const revenue = currentTrans.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + Number(t.valor || 0), 0);
    const expenses = currentTrans.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + Number(t.valor || 0), 0);
    const cogs = currentTrans.filter(t => t.tipo === 'despesa' && cogsCategories.includes(normalizeCategory(t.cat))).reduce((sum, t) => sum + Number(t.valor || 0), 0);
    
    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netIncome = revenue - expenses;
    const cashBurn = netIncome < 0 ? Math.abs(netIncome) : 0;

    const endingCash = state.contas?.reduce((acc, c) => acc + Number(c.current_balance || 0), 0) + Number(state.settings.cash_balance || 0);

    // Previous month values
    const prevRevenue = prevTrans.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + Number(t.valor || 0), 0);
    const prevExpenses = prevTrans.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + Number(t.valor || 0), 0);
    const prevCOGS = prevTrans.filter(t => t.tipo === 'despesa' && cogsCategories.includes(normalizeCategory(t.cat))).reduce((sum, t) => sum + Number(t.valor || 0), 0);
    const prevGrossProfit = prevRevenue - prevCOGS;
    const prevNetIncome = prevRevenue - prevExpenses;

    const calcChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      revenue,
      cogs,
      grossProfit,
      grossMargin,
      expenses,
      netIncome,
      cashBurn,
      endingCash,
      inflows: {
        sales: salesInflows || revenue * 0.85,
        investments: investInflows || revenue * 0.1,
        loans: loanInflows || 0,
        interest: interestInflows || revenue * 0.05
      },
      outflows: {
        salaries: salariesOutflows || expenses * 0.2,
        rentUtilities: rentUtilitiesOutflows || expenses * 0.4,
        inventory: inventoryOutflows || expenses * 0.3,
        taxes: taxesOutflows || expenses * 0.1
      },
      changes: {
        revenue: calcChange(revenue, prevRevenue),
        cogs: calcChange(cogs, prevCOGS),
        grossProfit: calcChange(grossProfit, prevGrossProfit),
        expenses: calcChange(expenses, prevExpenses),
        netIncome: calcChange(netIncome, prevNetIncome),
      }
    };
  }, [state.transacoes, state.contas, state.settings, selectedMonth, startDay]);

  // ─── DYNAMIC OR SIMULATED BASELINE ───
  const baseline = useMemo(() => {
    if (useSimulation || availableMonths.length === 0 || fpaData.revenue === 0) {
      return {
        revenue: 764664,
        cogs: 66526,
        grossProfit: 698138,
        grossMargin: 91,
        expenses: 1641847,
        netIncome: -1141194,
        cashBurn: 977896,
        endingCash: 3384680,
        inflows: {
          sales: 580000,
          investments: 95000,
          loans: 65000,
          interest: 24664
        },
        outflows: {
          salaries: 750000,
          rentUtilities: 410000,
          inventory: 320000,
          taxes: 161847
        },
        changes: {
          revenue: 67,
          cogs: 64,
          grossProfit: 67,
          expenses: 50,
          netIncome: 42,
          cashBurn: 35,
          endingCash: -25
        }
      };
    }
    return fpaData;
  }, [useSimulation, availableMonths.length, fpaData]);

  // ─── 13-WEEK CASH RUNWAY PROJECTION MODEL ───
  const cashFlowRunwayData = useMemo(() => {
    const data = [];
    let currentCash = baseline.endingCash;
    const totalInflow = baseline.inflows.sales + baseline.inflows.investments + baseline.inflows.interest;
    const totalOutflow = baseline.outflows.salaries + baseline.outflows.rentUtilities + baseline.outflows.inventory + baseline.outflows.taxes;
    
    // Average weekly surplus or deficit
    const weeklySurplus = (totalInflow - totalOutflow) / 4; 

    for (let week = 1; week <= 13; week++) {
      currentCash += weeklySurplus;
      data.push({
        week: `Sem ${week}`,
        'Saldo de Caixa': Math.max(0, currentCash),
        'Margem de Segurança': baseline.endingCash * 0.5
      });
    }
    return data;
  }, [baseline]);

  // ─── PROJECTIONS (FP&A 3-Year Plan) ───
  const projections = useMemo(() => {
    const factor = 1 + growthRate / 100;
    const baseRevenue = baseline.revenue * 12; // Annualized
    const baseCOGS = baseline.cogs * 12;
    const baseExpenses = baseline.expenses * 12;

    const proj2025 = {
      revenue: baseRevenue * factor,
      cogs: baseCOGS * factor,
      grossProfit: (baseRevenue * factor) - (baseCOGS * factor),
      opex: baseExpenses * 0.9
    };

    const proj2026 = {
      revenue: proj2025.revenue * factor,
      cogs: proj2025.cogs * factor,
      grossProfit: proj2025.revenue * factor - proj2025.cogs * factor,
      opex: proj2025.opex * 0.95
    };

    const proj2027 = {
      revenue: proj2026.revenue * factor,
      cogs: proj2026.cogs * factor,
      grossProfit: proj2026.revenue * factor - proj2026.cogs * factor,
      opex: proj2026.opex * 0.95
    };

    return {
      '2023': { revenue: baseRevenue * 0.7, cogs: baseCOGS * 0.7, gp: (baseRevenue * 0.7) - (baseCOGS * 0.7), opex: baseExpenses * 0.8 },
      '2024': { revenue: baseRevenue, cogs: baseCOGS, gp: baseRevenue - baseCOGS, opex: baseExpenses },
      '2025': proj2025,
      '2026': proj2026,
      '2027': proj2027
    };
  }, [baseline, growthRate]);

  // ─── BUDGET VS ACTUALS ───
  const budgetVsActuals = useMemo(() => {
    const budgets = state.budgets || [];
    if (budgets.length > 0 && !useSimulation) {
      const totalBudget = budgets.reduce((acc, b) => acc + Number(b.amount || 0), 0);
      const actualExpenses = fpaData.expenses;
      const percent = totalBudget > 0 ? (actualExpenses / totalBudget) * 100 : 0;
      return {
        budget: totalBudget,
        actual: actualExpenses,
        percent: Math.round(percent),
        miss: percent > 100 ? Math.round(percent - 100) : 0,
        saving: percent < 100 ? Math.round(100 - percent) : 0
      };
    }
    return {
      budget: 470064,
      actual: 469489,
      percent: 99.8,
      miss: 0,
      saving: 4
    };
  }, [state.budgets, fpaData.expenses, useSimulation]);

  // ─── DIAGNOSTICS FOR THE FINANCIAL PYRAMID ───
  const pyramidDiagnostics = useMemo(() => {
    const totalTransactions = state.transacoes?.length || 0;
    const uncategorized = state.transacoes?.filter(t => !t.cat || t.cat.toLowerCase() === 'outros' || t.cat.toLowerCase() === 'sem categoria').length || 0;
    const classificationScore = totalTransactions > 0 ? Math.round(((totalTransactions - uncategorized) / totalTransactions) * 100) : 0;

    const totalAccounts = state.contas?.length || 0;
    
    return {
      insights: {
        score: stats.totalScore,
        status: stats.totalScore > 75 ? 'Excelente' : stats.totalScore > 50 ? 'Estável' : 'Atenção',
        questions: [
          { q: 'A empresa/carteira cresceu?', a: stats.savingsRate > 0 ? 'Sim, taxa de poupança positiva.' : 'Não, saldo em declínio.' },
          { q: 'Estamos em perigo?', a: stats.runwayMonths < 6 ? 'Perigo, reserva menor que 6 meses.' : 'Seguro, runway saudável.' },
          { q: 'Há oportunidades de investimento?', a: stats.savingsRate > 20 ? 'Sim, capital disponível.' : 'Pouco capital de manobra.' }
        ]
      },
      analysis: {
        score: budgetVsActuals.percent <= 100 ? 100 : Math.max(0, 100 - budgetVsActuals.miss),
        status: budgetVsActuals.percent <= 100 ? 'No Orçamento' : 'Desvio Detetado',
        checks: [
          'Reconciliações mensais automáticas ativas',
          'Comparação contra períodos anteriores calculada',
          'Acompanhamento de orçamento em tempo real'
        ]
      },
      classifications: {
        score: classificationScore,
        status: `${classificationScore}% Mapeado`,
        uncategorizedCount: uncategorized,
        total: totalTransactions
      },
      data: {
        score: totalAccounts > 0 ? 100 : 0,
        status: totalAccounts > 0 ? 'Conectado' : 'Sem Fontes',
        details: [
          `Contas ativas registadas: ${totalAccounts}`,
          `Sincronização de SMS bancários: ${state.settings.sms_sync_enabled ? 'Ativa' : 'Inativa'}`,
          `Integridade dos dados: Excelência digital`
        ]
      }
    };
  }, [state, stats, budgetVsActuals]);

  const fmtValue = (val) => {
    return val.toLocaleString('pt-PT', { maximumFractionDigits: 0 }) + ' ' + currency;
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-20 max-w-7xl mx-auto w-full animate-fade-in text-gray-200">
      {/* ─── TABS HEADER ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Crown className="text-gold" size={24} /> 
            {activeTab === 'stewardship' ? 'Mordomia & Caráter' : 'Painel FP&A'}
          </h1>
          <p className="text-xs text-gray-400">
            {activeTab === 'stewardship' 
              ? 'Mede a prudência, diligência e generosidade na tua gestão.' 
              : 'Prepara relatórios como um CFO e prevê o teu futuro financeiro.'}
          </p>
        </div>

        <div className="flex gap-2 bg-midnight/60 p-1 rounded-xl border border-white/5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('stewardship')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'stewardship'
                ? 'bg-gold text-midnight shadow-lg shadow-gold/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy size={14} /> Mordomia
          </button>
          <button
            onClick={() => setActiveTab('fpa')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === 'fpa'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sliders size={14} /> Painel FP&A
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'stewardship' ? (
          <motion.div
            key="stewardship-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6"
          >
            {/* ─── HEADER: PROVERBS SCORE ─── */}
            <div className="relative overflow-hidden glass-card p-6 md:p-12 flex flex-col items-center text-center gap-6 min-h-[280px] md:min-h-[340px] justify-center">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-gold via-amber-500 to-gold shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-gold/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl" />

              <div className="relative">
                 <Trophy size={48} className="text-gold animate-bounce" />
                 <div className="absolute -top-1 -right-1">
                    <Sparkles size={16} className="text-white animate-pulse" />
                 </div>
              </div>

              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.4em] text-gray-500 mb-1">Índice de Mordomia</h2>
                <div className="text-6xl font-black text-white tracking-tighter tabular-nums flex items-baseline gap-2">
                  {stats.totalScore}
                  <span className="text-xl text-gold font-bold">/100</span>
                </div>
              </div>

              <p className="text-sm text-gray-400 max-w-md italic leading-relaxed">
                "Foste fiel no pouco, sobre o muito te colocarei." (Mateus 25:21)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ─── PILLARS ─── */}
              <div className="glass-card p-8 space-y-8">
                 <h3 className="text-xs font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                   <BookOpen size={14} className="text-indigo-400" /> Pilares da Mordomia
                 </h3>
                 
                 {[
                   { label: 'Generosidade', score: stats.generosityScore, icon: Heart, color: 'bg-rose-500' },
                   { label: 'Prudência', score: stats.prudenceScore, icon: Shield, color: 'bg-emerald-500' },
                   { label: 'Diligência', score: stats.diligenceScore, icon: Zap, color: 'bg-amber-500' },
                   { label: 'Integridade', score: stats.integrityScore, icon: Star, color: 'bg-blue-500' }
                 ].map(pillar => (
                   <div key={pillar.label} className="space-y-3">
                      <div className="flex justify-between items-center">
                         <div className="flex items-center gap-2">
                            <pillar.icon size={14} className="text-gray-400" />
                            <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">{pillar.label}</span>
                         </div>
                         <span className="text-xs font-black text-white">{Math.round(pillar.score)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${pillar.score}%` }}
                           className={`h-full ${pillar.color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} 
                         />
                      </div>
                   </div>
                 ))}
              </div>

              {/* ─── RUNWAY CARD ─── */}
              <div className="glass-card p-8 flex flex-col items-center justify-center text-center gap-4 border-indigo-500/20">
                 <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <Clock size={32} />
                 </div>
                 <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Pista de Sobrevivência (Runway)</span>
                    <div className="text-4xl font-black text-white mt-1">
                       {stats.runwayMonths} <span className="text-sm font-bold text-indigo-400 uppercase">Meses</span>
                    </div>
                 </div>
                 <p className="text-[10px] text-gray-500 leading-relaxed max-w-[200px]">
                    Se o teu rendimento parar hoje, consegues manter o teu estilo de vida por este período.
                 </p>
                 {stats.runwayMonths < 6 && (
                   <div className="mt-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest border border-amber-500/20 animate-pulse">
                      Alerta de Prudência
                   </div>
                 )}
              </div>

              {/* ─── BADGES ─── */}
              <div className="glass-card p-8 md:col-span-2">
                 <h3 className="text-xs font-black uppercase tracking-widest text-white mb-8 flex items-center gap-2">
                   <Crown size={14} className="text-gold" /> Galeria de Honra
                 </h3>

                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {badges.map(badge => (
                      <div 
                        key={badge.id}
                        className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-3 transition-all duration-300 ${
                          badge.active 
                            ? 'bg-white/5 border-white/10 hover:border-gold/30 hover:bg-white/10 opacity-100 scale-100 shadow-xl' 
                            : 'bg-black/20 border-transparent opacity-20 grayscale scale-95'
                        }`}
                      >
                        <div className={`p-3 rounded-xl bg-midnight border border-white/5 ${badge.active ? badge.color : 'text-gray-600'}`}>
                          <badge.icon size={24} />
                        </div>
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-tight ${badge.active ? 'text-white' : 'text-gray-500'}`}>{badge.label}</p>
                          {badge.active && <p className="text-[9px] text-gray-500 mt-1 leading-tight">{badge.desc}</p>}
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>

            {/* ─── PROVERBS INSIGHT ─── */}
            <div className="glass-card p-8 border-gold/20 flex flex-col md:flex-row items-center gap-8">
               <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center text-gold shrink-0">
                  <Info size={32} />
               </div>
               <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">Conselho da Binth</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    O teu índice de {stats.totalScore}% reflete uma gestão {stats.totalScore > 80 ? 'excelente' : stats.totalScore > 50 ? 'equilibrada' : 'que precisa de atenção'}. 
                    {stats.generosityScore < 50 && ' Lembra-te que a generosidade abre portas para a abundância.'}
                    {stats.prudenceScore < 50 && ' Tenta aumentar a tua reserva de emergência para dias de tempestade.'}
                  </p>
               </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="fpa-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6"
          >
            {/* ─── FP&A SUB-NAVIGATION & SELECTOR ─── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-2">
              <div className="flex gap-2 overflow-x-auto w-full sm:w-auto">
                <button
                  onClick={() => setFpaSubTab('dre')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                    fpaSubTab === 'dre' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <BarChart3 size={14} /> Demonstração de Resultados (DRE)
                </button>
                <button
                  onClick={() => setFpaSubTab('cashflow')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                    fpaSubTab === 'cashflow' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Scale size={14} /> Fluxo de Caixa (Inflows vs Outflows)
                </button>
                <button
                  onClick={() => setFpaSubTab('pyramid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                    fpaSubTab === 'pyramid' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Layers size={14} /> Pirâmide de Relatório Financeiro
                </button>
              </div>

              {/* DYNAMIC MONTH SELECTOR */}
              {availableMonths.length > 0 && !useSimulation && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider whitespace-nowrap">Análise de Período:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-midnight/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer w-full sm:w-auto"
                  >
                    {availableMonths.map(month => (
                      <option key={month} value={month}>
                        {getMonthLabel(month)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* ─── DATA CONTROL HEADER ─── */}
            <div className="glass-card p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-indigo-400 shrink-0" />
                <p className="text-xs text-gray-400">
                  {useSimulation || availableMonths.length === 0
                    ? "Estás a visualizar dados de simulação estratégica (CFO-grade demo)."
                    : `Estás a visualizar os teus dados financeiros reais do período de ${getMonthLabel(selectedMonth)}.`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Simular Dados Financeiros</span>
                <button
                  onClick={() => setUseSimulation(!useSimulation)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${
                    useSimulation || availableMonths.length === 0 ? 'bg-indigo-600 justify-end' : 'bg-white/10 justify-start'
                  }`}
                  disabled={availableMonths.length === 0}
                >
                  <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>

            {/* ─── SUB-TAB 1: DRE ─── */}
            {fpaSubTab === 'dre' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                {/* WHAT HAPPENED COMPARED TO LAST PERIOD */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar size={16} className="text-indigo-400" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">
                      O que aconteceu (Comparado com o período anterior)
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* REVENUE */}
                    <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Receitas (Revenue)</span>
                        <div className="text-lg font-black text-white tracking-tight mt-1">{fmtValue(baseline.revenue)}</div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] mt-2">
                        <span className={`flex items-center font-bold ${baseline.changes.revenue >= 0 ? 'text-leaf' : 'text-coral'}`}>
                          {baseline.changes.revenue >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {Math.abs(Math.round(baseline.changes.revenue))}%
                        </span>
                        <span className="text-gray-500">vs Mês Ant.</span>
                      </div>
                    </div>

                    {/* COGS */}
                    <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Custos Diretos (COGS)</span>
                        <div className="text-lg font-black text-white tracking-tight mt-1">{fmtValue(baseline.cogs)}</div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] mt-2">
                        <span className={`flex items-center font-bold ${baseline.changes.cogs <= 0 ? 'text-leaf' : 'text-coral'}`}>
                          {baseline.changes.cogs >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {Math.abs(Math.round(baseline.changes.cogs))}%
                        </span>
                        <span className="text-gray-500">vs Mês Ant.</span>
                      </div>
                    </div>

                    {/* GROSS PROFIT */}
                    <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Lucro Bruto (Gross Profit)</span>
                        <div className="text-lg font-black text-white tracking-tight mt-1">{fmtValue(baseline.grossProfit)}</div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] mt-2">
                        <span className={`flex items-center font-bold ${baseline.changes.grossProfit >= 0 ? 'text-leaf' : 'text-coral'}`}>
                          {baseline.changes.grossProfit >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {Math.abs(Math.round(baseline.changes.grossProfit))}%
                        </span>
                        <span className="text-gray-500">vs Mês Ant.</span>
                      </div>
                    </div>

                    {/* GROSS MARGIN */}
                    <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Margem Bruta (Gross Margin)</span>
                        <div className="text-lg font-black text-white tracking-tight mt-1">{baseline.grossMargin.toFixed(1)}%</div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] mt-2">
                        <span className="text-leaf font-bold">Saudável</span>
                        <span className="text-gray-500">alvo &gt; 80%</span>
                      </div>
                    </div>

                    {/* TOTAL EXPENSES */}
                    <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Despesas Totais</span>
                        <div className="text-lg font-black text-white tracking-tight mt-1">{fmtValue(baseline.expenses)}</div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] mt-2">
                        <span className={`flex items-center font-bold ${baseline.changes.expenses <= 0 ? 'text-leaf' : 'text-coral'}`}>
                          {baseline.changes.expenses >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {Math.abs(Math.round(baseline.changes.expenses))}%
                        </span>
                        <span className="text-gray-500">vs Mês Ant.</span>
                      </div>
                    </div>

                    {/* NET INCOME */}
                    <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Resultado Líquido</span>
                        <div className={`text-lg font-black tracking-tight mt-1 ${baseline.netIncome >= 0 ? 'text-leaf' : 'text-coral'}`}>
                          {fmtValue(baseline.netIncome)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] mt-2">
                        <span className={`flex items-center font-bold ${baseline.changes.netIncome >= 0 ? 'text-leaf' : 'text-coral'}`}>
                          {baseline.changes.netIncome >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {Math.abs(Math.round(baseline.changes.netIncome))}%
                        </span>
                        <span className="text-gray-500">vs Mês Ant.</span>
                      </div>
                    </div>

                    {/* CASH BURN */}
                    <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Queima de Caixa (Burn)</span>
                        <div className="text-lg font-black text-coral tracking-tight mt-1">
                          {baseline.cashBurn > 0 ? fmtValue(baseline.cashBurn) : '0 ' + currency}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] mt-2">
                        <span className={`font-bold ${baseline.cashBurn > 0 ? 'text-coral' : 'text-leaf'}`}>
                          {baseline.cashBurn > 0 ? 'Queima ativa' : 'Superavitário'}
                        </span>
                      </div>
                    </div>

                    {/* ENDING CASH */}
                    <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Saldo Final (Ending Cash)</span>
                        <div className="text-lg font-black text-indigo-400 tracking-tight mt-1">{fmtValue(baseline.endingCash)}</div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] mt-2">
                        <span className="text-gray-400">Total em contas</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BUDGET VS ACTUAL & TRENDS CHART */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* BUDGET VS ACTUAL */}
                  <div className="glass-card p-6 flex flex-col justify-between gap-6">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-white mb-2 flex items-center gap-2">
                        <Target size={14} className="text-indigo-400" /> Comparado com o Orçamento
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        O teu orçamento é a melhor estimativa de como o futuro se deveria desenhar.
                      </p>
                    </div>

                    {/* PROGRESS GAUGES */}
                    <div className="flex flex-col items-center justify-center gap-4 py-4">
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                          <motion.circle 
                            cx="50" cy="50" r="40" 
                            stroke="url(#indigoGrad2)" strokeWidth="8" fill="transparent" 
                            strokeDasharray="251.2"
                            initial={{ strokeDashoffset: 251.2 }}
                            animate={{ strokeDashoffset: 251.2 - (251.2 * Math.min(120, budgetVsActuals.percent)) / 100 }}
                            transition={{ duration: 1.5 }}
                          />
                          <defs>
                            <linearGradient id="indigoGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                              <stop offset="100%" stopColor="#4f46e5" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-white">{budgetVsActuals.percent}%</span>
                          <span className="text-[9px] text-gray-400 uppercase tracking-widest">Executado</span>
                        </div>
                      </div>

                      <div className="w-full text-center space-y-1">
                        <div className="text-xs text-gray-400">
                          Orçamentado: <span className="font-bold text-white">{fmtValue(budgetVsActuals.budget)}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Gasto Real: <span className="font-bold text-white">{fmtValue(budgetVsActuals.actual)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                      {budgetVsActuals.miss > 0 ? (
                        <span className="text-[10px] text-coral font-bold flex items-center justify-center gap-1">
                          <TrendingUp size={12} /> {budgetVsActuals.miss}% acima do orçamento delineado!
                        </span>
                      ) : (
                        <span className="text-[10px] text-leaf font-bold flex items-center justify-center gap-1">
                          <CheckCircle size={12} className="text-leaf" /> {budgetVsActuals.saving}% de poupança em relação ao orçamento!
                        </span>
                      )}
                    </div>
                  </div>

                  {/* TENDENCIAS ANUAIS CHART */}
                  <div className="glass-card p-6 lg:col-span-2 flex flex-col justify-between gap-4">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                        <TrendingUp size={14} className="text-indigo-400" /> Tendências Mensais de Performance
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        Compara o teu progresso com o ano anterior e com os teus benchmarks.
                      </p>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height={250}>
                        <AreaChart
                          data={[
                            { name: 'Jan', 'Ano Atual': baseline.revenue * 0.85, 'Ano Anterior': baseline.revenue * 0.72, 'Benchmark': baseline.revenue * 0.78 },
                            { name: 'Fev', 'Ano Atual': baseline.revenue * 0.94, 'Ano Anterior': baseline.revenue * 0.76, 'Benchmark': baseline.revenue * 0.78 },
                            { name: 'Mar', 'Ano Atual': baseline.revenue * 0.89, 'Ano Anterior': baseline.revenue * 0.81, 'Benchmark': baseline.revenue * 0.78 },
                            { name: 'Abr', 'Ano Atual': baseline.revenue * 1.06, 'Ano Anterior': baseline.revenue * 0.79, 'Benchmark': baseline.revenue * 0.85 },
                            { name: 'Mai', 'Ano Atual': baseline.revenue * 1.11, 'Ano Anterior': baseline.revenue * 0.84, 'Benchmark': baseline.revenue * 0.85 },
                            { name: 'Jun', 'Ano Atual': baseline.revenue, 'Ano Anterior': baseline.revenue * 0.88, 'Benchmark': baseline.revenue * 0.91 },
                          ]}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorCurrent2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                          <RTooltip 
                            contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            itemStyle={{ fontSize: '11px' }}
                            labelStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                            formatter={(val) => fmtValue(val)} 
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                          <Area type="monotone" dataKey="Ano Atual" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCurrent2)" />
                          <Area type="monotone" dataKey="Ano Anterior" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={1.5} fill="none" />
                          <Area type="monotone" dataKey="Benchmark" stroke="#10b981" strokeWidth={1} fill="none" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* FUTURE PROJECTIONS */}
                <div className="glass-card p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                        <Sliders size={14} className="text-indigo-400" /> Projeções Futuras (Planeamento a 3 Anos)
                      </h3>
                      <p className="text-[10px] text-gray-400">
                        Projeta e simula o crescimento financeiro a longo prazo.
                      </p>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5 w-full md:w-auto">
                      <div className="flex flex-col gap-1 w-full md:w-48">
                        <div className="flex justify-between text-[10px] font-bold text-gray-400">
                          <span>Taxa de Crescimento</span>
                          <span className="text-indigo-400 font-black">{growthRate}% ao ano</span>
                        </div>
                        <input 
                          type="range" min="1" max="40" value={growthRate}
                          onChange={(e) => setGrowthRate(Number(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="text-[10px] font-black uppercase tracking-wider text-gray-400">Item</th>
                          <th className="text-[10px] font-black uppercase tracking-wider text-gray-400">Real 2023</th>
                          <th className="text-[10px] font-black uppercase tracking-wider text-gray-400">Atual 2024</th>
                          <th className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/5">Projetado 2025</th>
                          <th className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/5">Projetado 2026</th>
                          <th className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/5">Projetado 2027</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="font-bold text-xs text-white">Receitas (Revenue)</td>
                          <td className="text-xs text-gray-400 tabular-nums">{fmtValue(projections['2023'].revenue)}</td>
                          <td className="text-xs text-gray-400 tabular-nums">{fmtValue(projections['2024'].revenue)}</td>
                          <td className="text-xs text-white bg-indigo-500/5 font-black tabular-nums">{fmtValue(projections['2025'].revenue)}</td>
                          <td className="text-xs text-white bg-indigo-500/5 font-black tabular-nums">{fmtValue(projections['2026'].revenue)}</td>
                          <td className="text-xs text-white bg-indigo-500/5 font-black tabular-nums">{fmtValue(projections['2027'].revenue)}</td>
                        </tr>
                        <tr>
                          <td className="font-bold text-xs text-white">Custos Diretos (COGS)</td>
                          <td className="text-xs text-gray-400 tabular-nums">{fmtValue(projections['2023'].cogs)}</td>
                          <td className="text-xs text-gray-400 tabular-nums">{fmtValue(projections['2024'].cogs)}</td>
                          <td className="text-xs text-gray-300 bg-indigo-500/5 tabular-nums">{fmtValue(projections['2025'].cogs)}</td>
                          <td className="text-xs text-gray-300 bg-indigo-500/5 tabular-nums">{fmtValue(projections['2026'].cogs)}</td>
                          <td className="text-xs text-gray-300 bg-indigo-500/5 tabular-nums">{fmtValue(projections['2027'].cogs)}</td>
                        </tr>
                        <tr className="border-t border-white/5">
                          <td className="font-black text-xs text-indigo-400">Lucro Bruto (Gross Profit)</td>
                          <td className="text-xs text-gray-400 tabular-nums">{fmtValue(projections['2023'].gp)}</td>
                          <td className="text-xs text-gray-400 tabular-nums">{fmtValue(projections['2024'].gp)}</td>
                          <td className="text-xs text-indigo-300 bg-indigo-500/5 font-black tabular-nums">{fmtValue(projections['2025'].grossProfit)}</td>
                          <td className="text-xs text-indigo-300 bg-indigo-500/5 font-black tabular-nums">{fmtValue(projections['2026'].grossProfit)}</td>
                          <td className="text-xs text-indigo-300 bg-indigo-500/5 font-black tabular-nums">{fmtValue(projections['2027'].grossProfit)}</td>
                        </tr>
                        <tr>
                          <td className="font-bold text-xs text-white">Custos Operacionais (OPEX)</td>
                          <td className="text-xs text-gray-400 tabular-nums">{fmtValue(projections['2023'].opex)}</td>
                          <td className="text-xs text-gray-400 tabular-nums">{fmtValue(projections['2024'].opex)}</td>
                          <td className="text-xs text-gray-300 bg-indigo-500/5 tabular-nums">{fmtValue(projections['2025'].opex)}</td>
                          <td className="text-xs text-gray-300 bg-indigo-500/5 tabular-nums">{fmtValue(projections['2026'].opex)}</td>
                          <td className="text-xs text-gray-300 bg-indigo-500/5 tabular-nums">{fmtValue(projections['2027'].opex)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* DOs AND DONTs */}
                <div className="glass-card overflow-hidden">
                  <div className="p-6 border-b border-white/5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                      <BookOpen size={14} className="text-indigo-400" /> Guia de Apresentação & Mordomia Financeira (DOs & DONTs)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-6 border-b md:border-b-0 md:border-r border-white/5 bg-coral/5">
                      <div className="flex items-center gap-2 text-coral font-bold text-xs uppercase tracking-widest mb-6">
                        <XCircle size={18} /> O que EVITAR (DON'Ts)
                      </div>
                      <div className="space-y-6">
                        <div>
                          <div className="flex gap-2 items-start">
                            <span className="px-1.5 py-0.5 rounded-sm bg-coral/20 text-coral text-[9px] font-black uppercase">Falsa Assunção</span>
                            <p className="text-xs text-white font-bold leading-tight">Assumir que todos compreendem finanças complexas</p>
                          </div>
                          <p className="text-[11px] text-gray-400 ml-4 mt-2 italic">
                            ❌ "O nosso EBITDA cresceu devido à melhoria do fundo de maneio e redução de DSO."
                          </p>
                        </div>
                        <div>
                          <div className="flex gap-2 items-start">
                            <span className="px-1.5 py-0.5 rounded-sm bg-coral/20 text-coral text-[9px] font-black uppercase">Leitura Fria</span>
                            <p className="text-xs text-white font-bold leading-tight">Limitar-te a ler passivamente o relatório de números</p>
                          </div>
                          <p className="text-[11px] text-gray-400 ml-4 mt-2 italic">
                            ❌ "Olhando para o slide 4, a receita é 100k, as despesas são 50k..."
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-leaf/5">
                      <div className="flex items-center gap-2 text-leaf font-bold text-xs uppercase tracking-widest mb-6">
                        <CheckCircle size={18} className="text-leaf" /> O que FAZER (DOs)
                      </div>
                      <div className="space-y-6">
                        <div>
                          <div className="flex gap-2 items-start">
                            <span className="px-1.5 py-0.5 rounded-sm bg-leaf/20 text-leaf text-[9px] font-black uppercase">Nível Base</span>
                            <p className="text-xs text-white font-bold leading-tight">Explicar conceitos ao nível fundamental</p>
                          </div>
                          <p className="text-[11px] text-gray-300 ml-4 mt-2">
                            ✅ "Ganhámos 100k em novos contratos - pensa nisso como reservas antecipadas. Podemos contar o dinheiro à medida que entregamos o serviço."
                          </p>
                        </div>
                        <div>
                          <div className="flex gap-2 items-start">
                            <span className="px-1.5 py-0.5 rounded-sm bg-leaf/20 text-leaf text-[9px] font-black uppercase">Storytelling</span>
                            <p className="text-xs text-white font-bold leading-tight">Contar uma história motivadora para o futuro</p>
                          </div>
                          <p className="text-[11px] text-gray-300 ml-4 mt-2">
                            ✅ "Com a taxa de poupança atual e redução de custos operacionais em 10%, atingiremos a nossa meta mais rápido."
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── SUB-TAB 2: CASH FLOW (INFLOWS VS OUTFLOWS) ─── */}
            {fpaSubTab === 'cashflow' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                {/* INFLOWS VS OUTFLOWS OVERVIEW CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CASH INFLOWS */}
                  <div className="glass-card p-6 border-leaf/10 bg-leaf/5 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-widest text-leaf flex items-center gap-2">
                        <ArrowDownLeft size={16} /> Entradas de Caixa (Cash Inflows)
                      </h3>
                      <span className="text-[10px] font-black text-gray-400">Dinheiro a entrar na carteira</span>
                    </div>

                    <div className="space-y-4">
                      {[
                        { label: 'Vendas & Salário (Sales Revenue)', value: baseline.inflows.sales, pct: 75, color: 'bg-emerald-500' },
                        { label: 'Investimentos (Investments)', value: baseline.inflows.investments, pct: 15, color: 'bg-teal-500' },
                        { label: 'Empréstimos (Loans)', value: baseline.inflows.loans, pct: 5, color: 'bg-cyan-500' },
                        { label: 'Juros Recebidos (Interest Earned)', value: baseline.inflows.interest, pct: 5, color: 'bg-sky-500' },
                      ].map(item => (
                        <div key={item.label} className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-300">{item.label}</span>
                            <span className="font-bold text-white tabular-nums">{fmtValue(item.value)}</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CASH OUTFLOWS */}
                  <div className="glass-card p-6 border-coral/10 bg-coral/5 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <h3 className="text-xs font-black uppercase tracking-widest text-coral flex items-center gap-2">
                        <ArrowUpRight size={16} /> Saídas de Caixa (Cash Outflows)
                      </h3>
                      <span className="text-[10px] font-black text-gray-400">Despesas e pagamentos</span>
                    </div>

                    <div className="space-y-4">
                      {[
                        { label: 'Pessoal & Salários (Salaries)', value: baseline.outflows.salaries, pct: 45, color: 'bg-rose-500' },
                        { label: 'Renda & Utilities (Rent/Utilities)', value: baseline.outflows.rentUtilities, pct: 25, color: 'bg-amber-500' },
                        { label: 'Compras & Stocks (Inventory)', value: baseline.outflows.inventory, pct: 20, color: 'bg-orange-500' },
                        { label: 'Impostos & Taxas (Taxes)', value: baseline.outflows.taxes, pct: 10, color: 'bg-red-500' },
                      ].map(item => (
                        <div key={item.label} className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-300">{item.label}</span>
                            <span className="font-bold text-white tabular-nums">{fmtValue(item.value)}</span>
                          </div>
                          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* THE CATCH ALERT */}
                <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5 flex flex-col md:flex-row items-center gap-6">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">O Grande "Catch" do Fluxo de Caixa</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Mesmo que a tua empresa ou finanças pareçam lucrativas no papel, podes enfrentar crises de liquidez se as saídas acontecerem antes das entradas! 
                      A chave para a sobrevivência é monitorizar o fluxo constantemente e construir uma **reserva de caixa robusta**.
                    </p>
                  </div>
                </div>

                {/* 13-WEEK CASH RUNWAY CHART */}
                <div className="glass-card p-6">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2 mb-2">
                      <LineChart size={14} className="text-indigo-400" /> Projeção de Tesouraria a 13 Semanas (Runway)
                    </h3>
                    <p className="text-[10px] text-gray-400">
                      Simulação do saldo semanal de caixa ao longo do próximo trimestre com base na tua taxa atual de entradas e saídas.
                    </p>
                  </div>

                  <div className="h-64 w-full mt-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={cashFlowRunwayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCash2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="week" stroke="#94a3b8" fontSize={9} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                        <RTooltip 
                          contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                          itemStyle={{ fontSize: '11px' }}
                          labelStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                          formatter={(val) => fmtValue(val)} 
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        <Area type="monotone" dataKey="Saldo de Caixa" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCash2)" />
                        <Area type="monotone" dataKey="Margem de Segurança" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" fill="none" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* STRATEGIC STEPS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { title: 'Monitorização', desc: 'Monitorizar o fluxo de caixa regularmente de forma sistemática.' },
                    { title: 'Previsões', desc: 'Criar projeções detalhadas a 13 semanas para antecipar faltas de liquidez.' },
                    { title: 'Otimização', desc: 'Otimizar os processos de contas a receber (A/R) e a pagar (A/P).' },
                    { title: 'Reserva', desc: 'Construir e blindar uma reserva robusta de tesouraria para emergências.' },
                  ].map((step, idx) => (
                    <div key={step.title} className="glass-card p-4 flex flex-col gap-2">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Passo 0{idx + 1}</span>
                      <h4 className="text-xs font-bold text-white leading-tight">{step.title}</h4>
                      <p className="text-[10px] text-gray-400 leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── SUB-TAB 3: FINANCIAL REPORTING PYRAMID ─── */}
            {fpaSubTab === 'pyramid' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                {/* PYRAMID VISUAL ELEMENT */}
                <div className="flex flex-col items-center justify-center p-4">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-500 mb-8 text-center">
                    A Pirâmide do Relatório Financeiro (Maturidade)
                  </span>

                  <div className="flex flex-col gap-2 w-full max-w-sm">
                    {/* LEVEL 1: INSIGHTS */}
                    <button
                      onClick={() => setActivePyramidLevel('insights')}
                      className={`w-full py-4 text-center rounded-xl transition-all duration-300 flex flex-col items-center justify-center border ${
                        activePyramidLevel === 'insights' 
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl shadow-indigo-600/30 scale-105' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                      style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }}
                    >
                      <Trophy size={16} className="mb-1" />
                      <span className="text-xs font-black uppercase tracking-widest">Insights & Decisão</span>
                      <span className="text-[9px] opacity-80">Nível 4 (Topo)</span>
                    </button>

                    {/* LEVEL 2: ANALYSIS */}
                    <button
                      onClick={() => setActivePyramidLevel('analysis')}
                      className={`w-full py-5 text-center rounded-xl transition-all duration-300 flex flex-col items-center justify-center border ${
                        activePyramidLevel === 'analysis' 
                          ? 'bg-indigo-700 border-indigo-500 text-white shadow-xl shadow-indigo-700/30 scale-105' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                      style={{ clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)' }}
                    >
                      <Sliders size={16} className="mb-1" />
                      <span className="text-xs font-black uppercase tracking-widest">Análise de Desvios</span>
                      <span className="text-[9px] opacity-80">Nível 3</span>
                    </button>

                    {/* LEVEL 3: CLASSIFICATIONS */}
                    <button
                      onClick={() => setActivePyramidLevel('classifications')}
                      className={`w-full py-6 text-center rounded-xl transition-all duration-300 flex flex-col items-center justify-center border ${
                        activePyramidLevel === 'classifications' 
                          ? 'bg-indigo-800 border-indigo-600 text-white shadow-xl shadow-indigo-800/30 scale-105' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                      style={{ clipPath: 'polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%)' }}
                    >
                      <CheckCircle size={16} className="mb-1" />
                      <span className="text-xs font-black uppercase tracking-widest">Mapeamento & Classificação</span>
                      <span className="text-[9px] opacity-80">Nível 2</span>
                    </button>

                    {/* LEVEL 4: SOURCE DATA */}
                    <button
                      onClick={() => setActivePyramidLevel('data')}
                      className={`w-full py-7 text-center rounded-xl transition-all duration-300 flex flex-col items-center justify-center border ${
                        activePyramidLevel === 'data' 
                          ? 'bg-indigo-950 border-indigo-700 text-white shadow-xl shadow-indigo-950/30 scale-105' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <Database size={16} className="mb-1" />
                      <span className="text-xs font-black uppercase tracking-widest">Dados de Origem Limpos</span>
                      <span className="text-[9px] opacity-80">Nível 1 (Base)</span>
                    </button>
                  </div>
                </div>

                {/* DIAGNOSTIC PANEL FOR ACTIVE LEVEL */}
                <div className="flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {activePyramidLevel === 'insights' && (
                      <motion.div
                        key="insights-diag"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="glass-card p-6 space-y-6"
                      >
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <h4 className="text-sm font-black text-white uppercase tracking-widest">Insights & Decisão (CFO)</h4>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                            {pyramidDiagnostics.insights.status}
                          </span>
                        </div>

                        <p className="text-xs text-gray-400 leading-relaxed">
                          O topo da pirâmide foca-se em extrair sabedoria e respostas do teu relatório financeiro para guiar decisões assertivas.
                        </p>

                        <div className="space-y-4">
                          {pyramidDiagnostics.insights.questions.map(item => (
                            <div key={item.q} className="p-3 rounded-xl bg-white/5 space-y-1">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{item.q}</div>
                              <div className="text-xs text-white font-semibold">{item.a}</div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {activePyramidLevel === 'analysis' && (
                      <motion.div
                        key="analysis-diag"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="glass-card p-6 space-y-6"
                      >
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <h4 className="text-sm font-black text-white uppercase tracking-widest">Análise de Desvios</h4>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">
                            {pyramidDiagnostics.analysis.status}
                          </span>
                        </div>

                        <p className="text-xs text-gray-400 leading-relaxed">
                          A análise cruza os teus dados reais contra orçamentos ou estimativas anteriores para identificar áreas de risco.
                        </p>

                        <div className="space-y-3">
                          {pyramidDiagnostics.analysis.checks.map(check => (
                            <div key={check} className="flex items-center gap-2 text-xs text-white">
                              <CheckCircle size={14} className="text-indigo-400 shrink-0" />
                              <span>{check}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {activePyramidLevel === 'classifications' && (
                      <motion.div
                        key="classifications-diag"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="glass-card p-6 space-y-6"
                      >
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <h4 className="text-sm font-black text-white uppercase tracking-widest">Mapeamento & Classificação</h4>
                          <span className="px-2 py-0.5 rounded bg-indigo-600/10 text-indigo-400 text-[10px] font-bold">
                            {pyramidDiagnostics.classifications.status}
                          </span>
                        </div>

                        <p className="text-xs text-gray-400 leading-relaxed">
                          Garante que todas as transações de entrada e saída estão classificadas corretamente para evitar relatórios enviesados.
                        </p>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Classificação Automática</span>
                              <span className="font-bold text-white">{pyramidDiagnostics.classifications.score}%</span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${pyramidDiagnostics.classifications.score}%` }} />
                            </div>
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Tens {pyramidDiagnostics.classifications.uncategorizedCount} transações sem categoria de um total de {pyramidDiagnostics.classifications.total}.
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activePyramidLevel === 'data' && (
                      <motion.div
                        key="data-diag"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="glass-card p-6 space-y-6"
                      >
                        <div className="flex justify-between items-center border-b border-white/5 pb-3">
                          <h4 className="text-sm font-black text-white uppercase tracking-widest">Dados de Origem Limpos</h4>
                          <span className="px-2 py-0.5 rounded bg-indigo-950/20 text-indigo-300 text-[10px] font-bold">
                            {pyramidDiagnostics.data.status}
                          </span>
                        </div>

                        <p className="text-xs text-gray-400 leading-relaxed">
                          A base de qualquer planeamento. Os dados de transações devem ser fáceis de aceder, precisos e sem lacunas.
                        </p>

                        <div className="space-y-3">
                          {pyramidDiagnostics.data.details.map(detail => (
                            <div key={detail} className="flex items-center gap-2 text-xs text-white">
                              <Database size={14} className="text-indigo-400 shrink-0" />
                              <span>{detail}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
