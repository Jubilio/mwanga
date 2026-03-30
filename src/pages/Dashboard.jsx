/* eslint-disable no-unused-vars */
import {
  Bell,
  Wallet,
  Eye,
  EyeOff,
  Plus,
  ArrowUpRight,
  ArrowDownToLine,
  Coins,
  CreditCard,
  ShieldCheck,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Sparkles,
  Target,
  PiggyBank
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { state } = useFinance();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);

  const currency = state.settings.currency || 'MT';
  const startDay = state.settings.financial_month_start_day || 1;
  const monthKey = getFinancialMonthKey(new Date(), startDay);

  const totals = calcMonthlyTotals(state.transacoes, monthKey, state.rendas, startDay);
  const score = calcFinancialScore(state.transacoes, state.budgets, monthKey, state.rendas, startDay);
  const risk = calcRiskLevel(score);
  const savingsRate = calcSavingsRate(totals.totalIncome, totals.totalExpenses);
  const totalContas = state.contas?.reduce((acc, curr) => acc + Number(curr.current_balance || 0), 0) || 0;
  const realBalance = totalContas + totals.unlinkedSaldo;
  const pendingHousing = state.rendas.filter(r => r.estado === 'pendente').length;
  const pendingDebts = state.dividas.filter(d => Number(d.remaining_amount || 0) > 0).length;
  const totalAlerts = pendingDebts + pendingHousing;

  const latestTransactions = useMemo(() => 
    [...state.transacoes]
      .sort((a, b) => `${b.data || ''}`.localeCompare(`${a.data || ''}`) || Number(b.id || 0) - Number(a.id || 0))
      .slice(0, 5),
    [state.transacoes]
  );

  // Greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // Score color and label
  const scoreColor = score > 70 ? 'text-leaf dark:text-leaf-light' : score > 40 ? 'text-gold dark:text-gold-light' : 'text-coral';
  const scoreLabel = score > 70 ? 'Excelente' : score > 40 ? 'Moderado' : 'Atenção';

  // Income vs Expense progress
  const totalFlow = totals.totalIncome + totals.totalExpenses;
  const incomePercent = totalFlow > 0 ? (totals.totalIncome / totalFlow) * 100 : 50;

  // Quick actions config
  const quickActions = [
    {
      icon: Plus,
      label: 'Despesa',
      sublabel: 'Registar gasto',
      gradient: 'from-coral to-coral-light',
      bg: 'bg-gradient-to-br from-coral to-coral-light',
      onClick: () => navigate('/transacoes', { state: { openModal: true, tipo: 'despesa' } })
    },
    {
      icon: ArrowUpRight,
      label: 'Receita',
      sublabel: 'Registar ganho',
      gradient: 'from-leaf to-leaf-light',
      bg: 'bg-gradient-to-br from-leaf to-leaf-light',
      onClick: () => navigate('/transacoes', { state: { openModal: true, tipo: 'receita' } })
    },
    {
      icon: ArrowRightLeft,
      label: 'Transações',
      sublabel: 'Ver histórico',
      gradient: 'from-ocean to-sky',
      bg: 'bg-gradient-to-br from-ocean to-sky',
      onClick: () => navigate('/transacoes')
    },
    {
      icon: Coins,
      label: 'Xitique',
      sublabel: 'Poupança coletiva',
      gradient: 'from-gold to-gold-light',
      bg: 'bg-gradient-to-br from-gold to-gold-light',
      onClick: () => navigate('/xitique')
    },
    {
      icon: CreditCard,
      label: 'Crédito',
      sublabel: 'Simular empréstimo',
      gradient: 'from-[#0a1926] to-[#1c3545]',
      bg: 'bg-gradient-to-br from-[#0a1926] to-[#1c3545]',
      onClick: () => navigate('/credito')
    },
    {
      icon: Target,
      label: 'Metas',
      sublabel: 'Objectivos',
      gradient: 'from-sky to-ocean',
      bg: 'bg-gradient-to-br from-sky to-ocean',
      onClick: () => navigate('/metas')
    }
  ];

  return (
    <div className="flex flex-col gap-5" style={{ paddingBottom: '7rem' }}>
      
      {/* ─── 1. BALANCE HERO ─── */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="dashboard-balance-hero"
      >
        {/* Greeting */}
        <div className="text-center mb-1">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">{greeting} ✨</span>
        </div>

        {/* Balance */}
        <div className="relative flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-gray-500 dark:text-gray-400 mb-1">Balanço Disponível</span>
          
          <div className="flex items-center gap-3">
            <AnimatePresence mode="wait">
              <motion.div 
                key={showBalance ? 'shown' : 'hidden'}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="text-4xl xs:text-5xl font-extrabold text-midnight dark:text-white tracking-tight"
              >
                {showBalance ? fmt(realBalance, currency) : '••••••'}
              </motion.div>
            </AnimatePresence>
            <button 
              onClick={() => setShowBalance(!showBalance)} 
              className="p-2.5 rounded-full bg-black/5 dark:bg-white/5 text-gray-400 hover:text-ocean dark:hover:text-sky transition-all active:scale-90"
              aria-label={showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
            >
              {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>

          {/* Monthly Flow Badge */}
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className={`mt-4 flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-full ${
              totals.saldo >= 0 
                ? 'bg-leaf/10 text-leaf dark:text-leaf-light' 
                : 'bg-coral/10 text-coral'
            }`}
          >
            {totals.saldo >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {totals.saldo >= 0 ? '+' : ''}{fmt(totals.saldo, currency)} fluxo mensal
          </motion.div>
        </div>

        {/* Income vs Expense Mini Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-5 px-4"
        >
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
            <span className="text-leaf dark:text-leaf-light">↑ Receitas {fmt(totals.totalIncome, currency)}</span>
            <span className="text-coral dark:text-coral-light">↓ Despesas {fmt(totals.totalExpenses, currency)}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-black/5 dark:bg-white/5 flex">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${incomePercent}%` }}
              transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-leaf to-leaf-light rounded-full"
            />
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${100 - incomePercent}%` }}
              transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-coral-light to-coral rounded-full"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* ─── 2. QUICK ACTIONS (Centered Grid) ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div className="dashboard-quick-actions">
          {quickActions.map((action, idx) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + idx * 0.05, duration: 0.3 }}
              onClick={action.onClick}
              className="dashboard-action-btn group"
            >
              <div className={`dashboard-action-icon ${action.bg} text-white shadow-lg group-hover:shadow-xl group-active:scale-90 transition-all duration-200`}>
                <action.icon size={22} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 tracking-wide">{action.label}</span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium hidden xs:block">{action.sublabel}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ─── 3. HEALTH + ALERTS (Side by Side on Desktop) ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.25, duration: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* Financial Health Score */}
        <div 
          onClick={() => navigate('/insights')}
          className="glass-card p-5 cursor-pointer active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ocean to-sky flex items-center justify-center text-white shadow-md">
                <ShieldCheck size={18} />
              </div>
              <div>
                <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Saúde Financeira</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-ocean dark:group-hover:text-sky transition-colors" />
          </div>
          
          <div className="flex items-end justify-between">
            <div>
              <div className={`text-3xl font-black ${scoreColor}`}>{score}<span className="text-lg">/ 100</span></div>
              <div className={`text-[10px] uppercase font-bold mt-1 ${scoreColor}`}>
                <Sparkles size={10} className="inline mr-1" />{scoreLabel} · Risco {risk.level}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-gray-500">{savingsRate}%</div>
              <div className="text-[9px] uppercase font-bold text-gray-400 flex items-center gap-1">
                <PiggyBank size={10} /> Poupança
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="mt-3 h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ delay: 0.5, duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                score > 70 ? 'bg-gradient-to-r from-leaf to-leaf-light' 
                : score > 40 ? 'bg-gradient-to-r from-gold to-gold-light' 
                : 'bg-gradient-to-r from-coral to-coral-light'
              }`}
            />
          </div>
        </div>

        {/* Alerts Card */}
        <div 
          onClick={() => navigate(pendingDebts > 0 ? '/dividas' : '/habitacao')}
          className="glass-card p-5 cursor-pointer active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ${
                totalAlerts > 0 
                  ? 'bg-gradient-to-br from-coral to-coral-light animate-pulse' 
                  : 'bg-gradient-to-br from-leaf to-leaf-light'
              }`}>
                <Bell size={18} />
              </div>
              <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Alertas</span>
            </div>
            <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-ocean dark:group-hover:text-sky transition-colors" />
          </div>

          {totalAlerts > 0 ? (
            <div>
              <div className="text-3xl font-black text-coral">{totalAlerts}</div>
              <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">Ações pendentes</div>
              <div className="mt-3 space-y-1.5">
                {pendingDebts > 0 && (
                  <div className="flex items-center gap-2 text-xs text-coral font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
                    {pendingDebts} dívida{pendingDebts > 1 ? 's' : ''} pendente{pendingDebts > 1 ? 's' : ''}
                  </div>
                )}
                {pendingHousing > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gold font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                    {pendingHousing} renda{pendingHousing > 1 ? 's' : ''} pendente{pendingHousing > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-black text-leaf dark:text-leaf-light">0</div>
              <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">Tudo em dia ✓</div>
              <div className="mt-3 text-xs text-leaf/80 dark:text-leaf-light/80 font-medium">
                Sem alertas ou pendências. Continue assim!
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── 4. CASHFLOW + ACCOUNTS (Side by Side on Desktop) ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.3, duration: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {/* Cashflow Card */}
        <div 
          onClick={() => navigate('/transacoes')}
          className="glass-card p-5 cursor-pointer active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-white shadow-md">
                <ArrowRightLeft size={18} />
              </div>
              <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Fluxo de Caixa</span>
            </div>
            <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-ocean dark:group-hover:text-sky transition-colors" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-leaf/10 flex items-center justify-center">
                  <ArrowUpRight size={14} className="text-leaf" />
                </div>
                <span className="text-xs font-semibold text-gray-500">Receitas</span>
              </div>
              <span className="text-sm font-bold text-leaf dark:text-leaf-light">{fmt(totals.totalIncome, currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-coral/10 flex items-center justify-center">
                  <ArrowDownToLine size={14} className="text-coral" />
                </div>
                <span className="text-xs font-semibold text-gray-500">Despesas</span>
              </div>
              <span className="text-sm font-bold text-coral dark:text-coral-light">{fmt(totals.totalExpenses, currency)}</span>
            </div>
            <div className="border-t border-black/5 dark:border-white/5 pt-2 flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400">Saldo mensal</span>
              <span className={`text-sm font-black ${totals.saldo >= 0 ? 'text-leaf dark:text-leaf-light' : 'text-coral'}`}>
                {totals.saldo >= 0 ? '+' : ''}{fmt(totals.saldo, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Active Accounts Card */}
        <div 
          onClick={() => navigate('/patrimonio')}
          className="glass-card p-5 cursor-pointer active:scale-[0.98] transition-all group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-midnight to-dark-light flex items-center justify-center text-gold shadow-md">
                <Wallet size={18} />
              </div>
              <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Contas Activas</span>
            </div>
            <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-ocean dark:group-hover:text-sky transition-colors" />
          </div>

          <div className="text-2xl font-black text-ocean dark:text-sky">{fmt(totalContas, currency)}</div>
          <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">Total em {state.contas?.length || 0} conta{(state.contas?.length || 0) !== 1 ? 's' : ''}</div>
          
          {/* Mini account list */}
          {state.contas && state.contas.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {state.contas.slice(0, 3).map((conta, i) => (
                <div key={conta.id || i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium truncate max-w-[120px]">{conta.name || conta.tipo || 'Conta'}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-300">{fmt(Number(conta.current_balance || 0), currency)}</span>
                </div>
              ))}
              {state.contas.length > 3 && (
                <div className="text-[10px] text-ocean dark:text-sky font-bold">+{state.contas.length - 3} mais</div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── 5. AI INSIGHTS (BINTH) ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
        <BinthContextual page="dashboard" />
      </motion.div>

      {/* ─── 6. LATEST TRANSACTIONS ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold dark:text-white flex items-center gap-2">
            Últimas Transações
          </h2>
          <button 
            onClick={() => navigate('/transacoes')}
            className="text-[10px] font-bold text-ocean dark:text-sky uppercase tracking-wider hover:underline flex items-center gap-1"
          >
            Ver Todas <ChevronRight size={12} />
          </button>
        </div>
        <div className="glass-card overflow-hidden">
          {latestTransactions.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-3xl mb-2">📝</div>
              <div className="text-sm font-bold text-gray-400 dark:text-gray-500">Sem transações recentes</div>
              <div className="text-[10px] text-gray-400 mt-1">Registre sua primeira transação</div>
              <button 
                onClick={() => navigate('/transacoes', { state: { openModal: true } })}
                className="mt-4 text-xs font-bold text-ocean dark:text-sky bg-ocean/10 dark:bg-sky/10 px-4 py-2 rounded-full hover:bg-ocean/20 dark:hover:bg-sky/20 transition-colors"
              >
                + Adicionar
              </button>
            </div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {latestTransactions.map((t, idx) => (
                <motion.div 
                  key={t.id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + idx * 0.05, duration: 0.3 }}
                  className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      t.tipo === 'despesa' 
                        ? 'bg-coral/10 text-coral' 
                        : 'bg-leaf/10 text-leaf dark:text-leaf-light'
                    }`}>
                      {t.tipo === 'despesa' ? <ArrowDownToLine size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div>
                      <div className="font-bold text-sm dark:text-gray-200 leading-tight">{t.desc}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                        {t.categoria && <span className="text-ocean dark:text-sky">{t.categoria} · </span>}
                        {t.data}
                      </div>
                    </div>
                  </div>
                  <div className={`font-bold text-sm tabular-nums ${
                    t.tipo === 'despesa' 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-leaf dark:text-leaf-light'
                  }`}>
                    {t.tipo === 'despesa' ? '-' : '+'}{fmt(t.valor, currency)}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

    </div>
  );
}
