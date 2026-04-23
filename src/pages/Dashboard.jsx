import { Plus, ArrowUpRight, Coins, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BinthContextual from '../components/BinthContextual';
import BalanceTrendChart from '../components/BalanceTrendChart';
import { useFinance } from '../hooks/useFinance';
import {
  calcFinancialScore,
  calcMonthlyTotals,
  calcSavingsRate,
  fmt,
  getFinancialMonthKey
} from '../utils/calculations';

// Sub-components
import DashboardHero from '../components/dashboard/DashboardHero';
import DashboardQuickActions from '../components/dashboard/DashboardQuickActions';
import { HealthCard, AlertsCard, AccountsCard, CashFlowCard, StewardshipCard } from '../components/dashboard/DashboardCards';
import DashboardTransactions from '../components/dashboard/DashboardTransactions';
import { useStewardship } from '../hooks/useStewardship';

const MotionDiv = motion.div;

export default function Dashboard() {
  const { state, reloadData } = useFinance();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showBalance, setShowBalance] = useState(() => localStorage.getItem('mwanga-show-balance') !== 'false');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleBalance = () => {
    const newState = !showBalance;
    setShowBalance(newState);
    localStorage.setItem('mwanga-show-balance', newState.toString());
  };

  const currency = state.settings.currency || 'MT';
  const startDay = state.settings.financial_month_start_day || 1;
  const monthKey = getFinancialMonthKey(new Date(), startDay);

  const totals = calcMonthlyTotals(state.transacoes, monthKey, state.rendas, startDay);
  const score = calcFinancialScore(state.transacoes, state.budgets, monthKey, state.rendas, startDay);
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

  const formattedBalance = useMemo(() => {
    const raw = fmt(realBalance, '');
    const [intPart, ...decParts] = raw.split(',');
    return {
      integer: intPart || '0',
      decimal: decParts.join(',') || '00',
    };
  }, [realBalance]);

  const trendData = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString('pt-PT', { month: 'short' }).replace('.', '');
      months[key] = { name: key, total: 0, rawDate: d };
    }
    state.transacoes.forEach(t => {
      const tDate = new Date(t.data);
      const key = tDate.toLocaleString('pt-PT', { month: 'short' }).replace('.', '');
      if (months[key]) {
        if (t.tipo === 'receita') months[key].total += Number(t.valor);
        else months[key].total -= Number(t.valor);
      }
    });
    return Object.values(months);
  }, [state.transacoes]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try { await reloadData(); } finally { setIsRefreshing(false); }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const { stats, badges } = useStewardship();

  return (
    <MotionDiv 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="flex flex-col gap-6" 
      style={{ paddingBottom: '7rem' }}
    >
      <DashboardHero 
        greeting={greeting}
        handleRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        t={t}
        showBalance={showBalance}
        toggleBalance={toggleBalance}
        formattedBalance={formattedBalance}
        currency={currency}
        totals={totals}
        state={state}
        itemVariants={itemVariants}
      />

      <DashboardQuickActions 
        quickActions={quickActions} 
        itemVariants={itemVariants} 
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <HealthCard 
          navigate={navigate}
          score={score}
          scoreColor={scoreColor}
          scoreLabel={scoreLabel}
          itemVariants={itemVariants}
          t={t}
        />
        <StewardshipCard
          navigate={navigate}
          stats={stats}
          badges={badges}
          itemVariants={itemVariants}
        />
        <AlertsCard 
          navigate={navigate}
          totalAlerts={totalAlerts}
          pendingDebts={pendingDebts}
          pendingHousing={pendingHousing}
          itemVariants={itemVariants}
        />
      </div>

      <MotionDiv variants={itemVariants}>
         <BalanceTrendChart data={trendData} currency={currency} />
      </MotionDiv>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AccountsCard 
          navigate={navigate}
          state={state}
          showBalance={showBalance}
          currency={currency}
          maxContaBalance={maxContaBalance}
          totalContas={totalContas}
          itemVariants={itemVariants}
        />
        <CashFlowCard 
          navigate={navigate}
          totals={totals}
          showBalance={showBalance}
          currency={currency}
          savingsRate={savingsRate}
          itemVariants={itemVariants}
        />
      </div>

      <MotionDiv variants={itemVariants}>
         <BinthContextual page="dashboard" />
      </MotionDiv>

      <DashboardTransactions 
        latestTransactions={latestTransactions}
        navigate={navigate}
        showBalance={showBalance}
        currency={currency}
        itemVariants={itemVariants}
        t={t}
      />
    </MotionDiv>
  );
}
