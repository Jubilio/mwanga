import {
  Bell,
  Wallet,
  Eye,
  EyeOff,
  Plus,
  ArrowUpRight,
  ArrowDownToLine,
  Coins,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Sparkles,
  Target,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BinthContextual from '../components/BinthContextual';
import { useFinance } from '../hooks/useFinance';
import {
  calcFinancialScore,
  calcMonthlyTotals,
  calcRiskLevel,
  calcSavingsRate,
  fmt,
  getFinancialMonthKey
} from '../utils/calculations';

export default function Dashboard() {
  const { state, reloadData } = useFinance();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currency = state.settings.currency || 'MT';
  const startDay = state.settings.financial_month_start_day || 1;
  const monthKey = getFinancialMonthKey(new Date(), startDay);

  const totals = calcMonthlyTotals(state.transacoes, monthKey, state.rendas, startDay);
  const score = calcFinancialScore(state.transacoes, state.budgets, monthKey, state.rendas, startDay);
  const risk = calcRiskLevel(score);
  const savingsRate = calcSavingsRate(totals.totalIncome, totals.totalExpenses);

  const totalContas = state.contas?.reduce((acc, curr) => acc + Number(curr.current_balance || 0), 0) || 0;
  const cashSetting = Number(state.settings.cash_balance || 0);
  const realBalance = totalContas + cashSetting;
  const pendingHousing = state.rendas.filter(r => r.estado === 'pendente').length;
  const pendingDebts = state.dividas.filter(d => Number(d.remaining_amount || 0) > 0).length;
  const totalAlerts = pendingDebts + pendingHousing;

  const latestTransactions = useMemo(() =>
    [...state.transacoes]
      .sort((a, b) => `${b.data || ''}`.localeCompare(`${a.data || ''}`) || Number(b.id || 0) - Number(a.id || 0))
      .slice(0, 5),
    [state.transacoes]
  );

  // O saldo máximo entre contas — calculado FORA do .map() para evitar O(n²).
  const maxContaBalance = useMemo(
    () => Math.max(...(state.contas?.map(c => Number(c.current_balance || 0)) ?? [0]), 1),
    [state.contas]
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  }, [t]);

  const scoreColor = score > 70 ? 'text-leaf dark:text-leaf-light' : score > 40 ? 'text-gold dark:text-gold-light' : 'text-coral';
  const scoreLabel = score > 70 ? t('dashboard.health.excellent') : score > 40 ? t('dashboard.health.moderate') : t('dashboard.health.attention');

  const totalFlow = totals.totalIncome + totals.totalExpenses;
  const incomePercent = totalFlow > 0 ? (totals.totalIncome / totalFlow) * 100 : 50;

  const quickActions = [
    {
      icon: Plus,
      label: t('dashboard.quick_actions.expense'),
      gradient: 'from-coral to-coral-light',
      shadow: 'shadow-coral/20',
      onClick: () => navigate('/transacoes', { state: { openModal: true, tipo: 'despesa' } })
    },
    {
      icon: ArrowUpRight,
      label: t('dashboard.quick_actions.income'),
      gradient: 'from-leaf to-leaf-light',
      shadow: 'shadow-leaf/20',
      onClick: () => navigate('/transacoes', { state: { openModal: true, tipo: 'receita' } })
    },
    {
      icon: Coins,
      label: t('dashboard.quick_actions.xitique'),
      gradient: 'from-gold to-gold-light',
      shadow: 'shadow-gold/20',
      onClick: () => navigate('/xitique')
    },
    {
      icon: Target,
      label: t('dashboard.quick_actions.goals'),
      gradient: 'from-sky to-ocean',
      shadow: 'shadow-ocean/20',
      onClick: () => navigate('/metas')
    }
  ];

  // Formata o saldo principal em duas partes (inteiro + decimais) de forma segura.
  // O fmt() retorna sempre "1.234,56 MT" — o split por ',' é seguro dado que
  // a função sempre usa toFixed(2) internamente. Protegemos contra edge cases
  // com fallback explícito.
  const formattedBalance = useMemo(() => {
    const raw = fmt(realBalance, '');
    const [intPart, ...decParts] = raw.split(',');
    return {
      integer: intPart || '0',
      decimal: decParts.join(',') || '00',
    };
  }, [realBalance]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await reloadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="flex flex-col gap-6" 
      style={{ paddingBottom: '7rem' }}
    >

      {/* ─── 1. PREMIUM BALANCE HERO ─── */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[32px] bg-linear-to-br from-midnight via-[#12232e] to-midnight p-8 shadow-2xl">
        {/* Animated Orbs for Depth */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-ocean/10 blur-[100px] animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gold/5 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500/80">{greeting}</span>
            <div className="h-1 w-1 rounded-full bg-gold/50" />
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Actualizar dados"
              className="group p-1 text-gray-500 hover:text-gold transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={10}
                className={`transition-transform duration-500 ${
                  isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'
                }`}
              />
            </button>
          </div>

          <span className="mb-2 text-[11px] font-black uppercase tracking-[0.4em] text-sky/60">{t('dashboard.available_balance')}</span>

          <div className="flex w-full flex-col items-center gap-4 px-4 sm:flex-row sm:justify-center">
            <div className="flex items-baseline gap-1 text-white tracking-tighter">
              {showBalance ? (
                <>
                  <span className="text-4xl font-black sm:text-5xl">{formattedBalance.integer}</span>
                  <span className="text-xl font-bold opacity-30 sm:text-2xl">,{formattedBalance.decimal}</span>
                  <span className="ml-2 text-base font-black text-gold-light tracking-widest sm:text-lg">{currency}</span>
                </>
              ) : (
                <span className="text-4xl opacity-10 tracking-[0.4em] font-black sm:text-5xl">•••••</span>
              )}
            </div>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-gray-400 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white active:scale-90"
            >
              {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          {/* Flow Indicator Chips */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
             <div className={`flex items-center gap-2 rounded-2xl bg-white/5 py-2 px-4 backdrop-blur-xl border border-white/5 ${totals.saldo >= 0 ? 'text-leaf-light' : 'text-coral-light'}`}>
                {totals.saldo >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span className="text-[11px] font-black uppercase tracking-wider tabular-nums">
                  {totals.saldo >= 0 ? '+' : ''}{fmt(totals.saldo, currency)}
                </span>
             </div>
             {state.settings.cash_balance !== undefined && (
               <div className="flex items-center gap-2 rounded-2xl bg-white/5 py-2 px-4 backdrop-blur-xl border border-white/5 text-gold-light">
                 <Wallet size={14} />
                 <span className="text-[11px] font-black uppercase tracking-wider tabular-nums">
                   {showBalance ? fmt(state.settings.cash_balance, currency) : '••••'} Dinheiro
                 </span>
               </div>
             )}
          </div>

          {/* Premium Split-Tile Stats */}
          <div className="mt-10 flex w-full items-stretch border-t border-white/5 pt-6">
            {/* Income Tile */}
            <div className="flex flex-1 flex-col items-center gap-2 px-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-leaf-light/60">Rendimentos</span>
              <span className="text-sm font-black tabular-nums text-leaf-light sm:text-base">
                {fmt(totals.totalIncome, currency)}
              </span>
              <div className="mt-1 h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-linear-to-r from-leaf-light/40 to-leaf-light" 
                />
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="w-[1px] self-stretch bg-linear-to-b from-transparent via-white/10 to-transparent" />

            {/* Expense Tile */}
            <div className="flex flex-1 flex-col items-center gap-2 px-2">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-coral-light/60">Despesas</span>
              <span className="text-sm font-black tabular-nums text-coral-light sm:text-base">
                {fmt(totals.totalExpenses, currency)}
              </span>
              <div className="mt-1 h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totals.totalExpenses / Math.max(totals.totalIncome, 1)) * 100, 100)}%` }}
                  className="h-full bg-linear-to-r from-coral-light/40 to-coral-light" 
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. QUICK ACTION BUTTONS (With Hover Labels) ─── */}
      <motion.div variants={itemVariants} className="mb-12 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
        {quickActions.map((action, idx) => (
          <div key={action.label} className="group relative flex flex-col items-center">
            <button
              onClick={action.onClick}
              className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-white/5 dark:hover:bg-white/10 sm:h-16 sm:w-16"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${action.gradient} text-white shadow-lg ${action.shadow} transition-transform group-hover:scale-110 group-active:scale-95 sm:h-12 sm:w-12`}>
                <action.icon size={20} strokeWidth={3} />
              </div>
              
              {/* Subtle Glow Background */}
              <div className={`absolute inset-0 rounded-2xl bg-linear-to-br ${action.gradient} opacity-0 blur-xl transition-opacity group-hover:opacity-20`} />
            </button>

            {/* Hover Label (Tooltip style) */}
            <div className="pointer-events-none absolute -bottom-8 opacity-0 transition-all duration-300 group-hover:bottom-[-2.2rem] group-hover:opacity-100 z-20">
               <span className="whitespace-nowrap px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                 {action.label}
               </span>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ─── 3. HEALTH & ALERTS ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.div 
          variants={itemVariants}
          onClick={() => navigate('/insights')}
          className="glass-card group flex flex-col justify-between overflow-hidden p-5 cursor-pointer min-h-[160px]"
        >
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ocean/10 text-ocean dark:bg-sky/10 dark:text-sky">
                  <ShieldCheck size={18} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Saúde Financeira</span>
             </div>
             <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1" />
          </div>
          
          <div className="mt-4 flex items-baseline gap-2">
             <span className={`text-4xl font-black ${scoreColor}`}>{score}</span>
             <span className="text-xs font-bold text-slate-400">/ 100</span>
          </div>
          
          <div className="mt-2 flex items-center gap-2">
             <Sparkles size={12} className={scoreColor} />
             <span className={`text-[10px] font-black uppercase tracking-wider ${scoreColor}`}>{scoreLabel}</span>
          </div>

          <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${score}%` }}
               transition={{ duration: 1, ease: 'easeOut' }}
               className={`h-full bg-linear-to-r ${score > 70 ? 'from-leaf to-leaf-light' : score > 40 ? 'from-gold to-gold-light' : 'from-coral to-coral-light'}`}
             />
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          onClick={() => navigate(totalAlerts > 0 ? '/dividas' : '/patrimonio')}
          className="glass-card group flex flex-col justify-between p-6 cursor-pointer"
        >
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${totalAlerts > 0 ? 'bg-coral/10 text-coral animate-pulse' : 'bg-leaf/10 text-leaf'}`}>
                  <Bell size={20} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Alertas & Pendentes</span>
             </div>
             <ChevronRight size={18} className="text-slate-300 transition-transform group-hover:translate-x-1" />
          </div>

          <div className="mt-8">
             {totalAlerts > 0 ? (
               <div className="space-y-3">
                  <span className="text-5xl font-black text-coral">{totalAlerts}</span>
                  <div className="flex flex-col gap-1">
                    {pendingDebts > 0 && <span className="text-[10px] font-bold text-coral/80 uppercase tracking-wider">● {pendingDebts} Dívidas Pendentes</span>}
                    {pendingHousing > 0 && <span className="text-[10px] font-bold text-gold/80 uppercase tracking-wider">● {pendingHousing} Despesas de Habitação</span>}
                  </div>
               </div>
             ) : (
               <div className="space-y-3">
                  <span className="text-5xl font-black text-leaf-light">0</span>
                  <span className="block text-[10px] font-bold text-leaf/60 uppercase tracking-wider">Tudo sob controlo</span>
               </div>
             )}
          </div>
          
          <div className="mt-6 h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/5" />
        </motion.div>
      </div>

      {/* ─── 4. CONTAS ACTIVAS & FLUXO DE CAIXA ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Active Accounts Card */}
        <motion.div
          variants={itemVariants}
          onClick={() => navigate('/patrimonio')}
          className="glass-card group flex flex-col gap-4 p-5 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ocean/10 text-ocean dark:bg-sky/10 dark:text-sky">
                <Wallet size={18} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Contas Activas</span>
            </div>
            <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1" />
          </div>

          {state.contas?.length > 0 ? (
            <div className="flex flex-col gap-3">
              {state.contas
                .filter(conta => Number(conta.current_balance || 0) > 0)
                .sort((a, b) => Number(b.current_balance || 0) - Number(a.current_balance || 0))
                .slice(0, 4)
                .map((conta) => {
                  const pct = Math.min((Number(conta.current_balance || 0) / maxContaBalance) * 100, 100);
                  return (
                    <div key={conta.id} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[55%]">{conta.name}</span>
                        <span className="text-xs font-black tabular-nums text-midnight dark:text-white">{fmt(conta.current_balance, currency)}</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full bg-linear-to-r from-ocean/40 to-sky"
                        />
                      </div>
                    </div>
                  );
                })}
              {state.contas.filter(c => Number(c.current_balance || 0) > 0).length > 4 && (
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  +{state.contas.filter(c => Number(c.current_balance || 0) > 0).length - 4} contas...
                </span>
              )}
              {state.contas.filter(c => Number(c.current_balance || 0) > 0).length === 0 && (
                <div className="py-4 text-center text-xs text-slate-400 italic">Todas as contas com saldo zero</div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-slate-400">Sem contas registadas</div>
          )}

          <div className="mt-auto flex items-baseline gap-1 border-t border-slate-100 dark:border-white/5 pt-3">
            <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Total em Contas</span>
            <span className="ml-auto text-base font-black text-midnight dark:text-white tabular-nums">{fmt(totalContas, currency)}</span>
          </div>
        </motion.div>

        {/* Cash Flow Card */}
        <motion.div
          variants={itemVariants}
          onClick={() => navigate('/insights')}
          className="glass-card group flex flex-col gap-4 p-5 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${totals.saldo >= 0 ? 'bg-leaf/10 text-leaf' : 'bg-coral/10 text-coral'}`}>
                {totals.saldo >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fluxo de Caixa</span>
            </div>
            <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1" />
          </div>

          {/* Big Flow Number */}
          <div className="flex flex-col">
            <span className={`text-3xl font-black tabular-nums ${totals.saldo >= 0 ? 'text-leaf-light' : 'text-coral-light'}`}>
              {totals.saldo >= 0 ? '+' : ''}{fmt(totals.saldo, currency)}
            </span>
            <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${totals.saldo >= 0 ? 'text-leaf/60' : 'text-coral/60'}`}>
              {totals.saldo >= 0 ? '✓ Mês positivo' : '⚠ Despesas acima dos rendimentos'}
            </span>
          </div>

          {/* Income vs Expense mini bars */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="w-16 text-[9px] font-black uppercase tracking-widest text-leaf-light/70 shrink-0">Entradas</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className="h-full bg-linear-to-r from-leaf/30 to-leaf-light"
                />
              </div>
              <span className="text-[9px] font-black tabular-nums text-leaf-light shrink-0">{fmt(totals.totalIncome, currency)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-16 text-[9px] font-black uppercase tracking-widest text-coral-light/70 shrink-0">Saídas</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totals.totalExpenses / Math.max(totals.totalIncome, 1)) * 100, 100)}%` }}
                  className="h-full bg-linear-to-r from-coral/30 to-coral-light"
                />
              </div>
              <span className="text-[9px] font-black tabular-nums text-coral-light shrink-0">{fmt(totals.totalExpenses, currency)}</span>
            </div>
          </div>

          {/* Savings Rate */}
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Taxa de Poupança</span>
            <span className={`text-sm font-black ${savingsRate > 20 ? 'text-leaf-light' : savingsRate > 0 ? 'text-gold' : 'text-coral'}`}>
              {savingsRate.toFixed(1)}%
            </span>
          </div>
        </motion.div>
      </div>

      {/* ─── 5. AI INSIGHTS ─── */}
      <motion.div variants={itemVariants}>
         <BinthContextual page="dashboard" />
      </motion.div>


      {/* ─── 5. LATEST TRANSACTIONS ─── */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Últimos Registos</h3>
           <button onClick={() => navigate('/transacoes')} className="text-[10px] font-black uppercase tracking-widest text-ocean dark:text-sky hover:opacity-70 transition-opacity">Ver Tudo</button>
        </div>

        <div className="glass-card divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
          {latestTransactions.map((t, idx) => (
            <div key={t.id || idx} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/2">
              <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-[18px] ${t.tipo === 'despesa' ? 'bg-coral/10 text-coral' : 'bg-leaf/10 text-leaf dark:text-leaf-light'}`}>
                  {t.tipo === 'despesa' ? <ArrowDownToLine size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-midnight dark:text-white leading-tight">{t.desc}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t.data}</span>
                    <span className="text-[9px] font-bold text-ocean dark:text-sky/60 uppercase">{t.categoria}</span>
                  </div>
                </div>
              </div>
              <span className={`text-base font-black tabular-nums ${t.tipo === 'despesa' ? 'text-midnight dark:text-white' : 'text-leaf-light'}`}>
                {t.tipo === 'despesa' ? '-' : '+'}{fmt(t.valor, currency)}
              </span>
            </div>
          ))}

          {latestTransactions.length === 0 && (
            <div className="py-12 text-center">
               <span className="text-3xl opacity-20">📝</span>
               <p className="mt-2 text-xs font-bold text-slate-400">{t('dashboard.latest_transactions.empty')}</p>
            </div>
          )}
        </div>
      </motion.div>

    </motion.div>
  );
}
