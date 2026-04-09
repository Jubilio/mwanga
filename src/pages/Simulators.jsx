import { useEffect, useMemo, useState, Fragment } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { Banknote, Check, Flame, Info, RefreshCcw, Sparkles, Target, TrendingUp, Wallet } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useFinance } from '../hooks/useFinance';
/* eslint-disable no-unused-vars */
import { calcCompoundInterest, fmt } from '../utils/calculations';

function ProGate({ children, isPro, title, description }) {
  const { t } = useTranslation();
  if (isPro) return children;

  return (
    <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden' }}>
      <div style={{ filter: 'blur(10px)', opacity: 0.2, pointerEvents: 'none' }}>{children}</div>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 14,
          padding: 32,
          background: 'rgba(7, 20, 31, 0.72)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(201, 150, 58, 0.28)',
        }}
      >
        <div style={{ fontSize: 42 }}>🔒</div>
        <div className="text-center text-xl font-black text-gold font-display">{title}</div>
        <p className="max-w-[320px] text-center text-sm text-white/70 leading-6">{description}</p>
        <a
          href="/pricing"
          style={{
            padding: '12px 28px',
            borderRadius: 16,
            textDecoration: 'none',
            fontWeight: 900,
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-light))',
            color: '#08111a',
          }}
        >
          {t('simulators.pro_gate.btn')}
        </a>
      </div>
    </div>
  );
}

function solveMonthlyContributionForTarget(targetAmount, currentAmount, annualRate, years) {
  const safeTarget = Math.max(0, Number(targetAmount || 0));
  const safeCurrent = Math.max(0, Number(currentAmount || 0));
  const months = Math.max(1, Math.round(Number(years || 0) * 12));

  if (safeCurrent >= safeTarget) return 0;

  const monthlyRate = Math.max(0, Number(annualRate || 0)) / 100 / 12;
  if (monthlyRate === 0) {
    return Math.max(0, (safeTarget - safeCurrent) / months);
  }

  const growthFactor = Math.pow(1 + monthlyRate, months);
  const futureValueOfCurrent = safeCurrent * growthFactor;
  if (futureValueOfCurrent >= safeTarget) return 0;

  const annuityFactor = (growthFactor - 1) / monthlyRate;
  return Math.max(0, (safeTarget - futureValueOfCurrent) / annuityFactor);
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '12px 18px',
        borderRadius: 16,
        border: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontSize: 13,
        fontWeight: 800,
        background: active ? 'var(--color-ocean)' : 'transparent',
        color: active ? '#fff' : 'var(--color-muted)',
        boxShadow: active ? '0 8px 20px rgba(10, 77, 104, 0.35)' : 'none',
      }}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

export default function Simulators() {
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const { showToast } = useOutletContext();
  const currency = state.settings?.currency || 'MT';
  const isPro = state.settings?.plan === 'pro';

  const [activeTab, setActiveTab] = useState('budget');

  const [salary, setSalary] = useState(() => Number(state.settings?.user_salary || 50000));
  const [needsPct, setNeedsPct] = useState(50);
  const [wantsPct, setWantsPct] = useState(30);
  const [activeModel, setActiveModel] = useState('50/30/20');

  const [investmentPrincipal, setInvestmentPrincipal] = useState(50000);
  const [investmentMonthly, setInvestmentMonthly] = useState(10000);
  const [investmentRate, setInvestmentRate] = useState(12);
  const [investmentYears, setInvestmentYears] = useState(10);

  const [fireMonthlyNeed, setFireMonthlyNeed] = useState(35000);
  const [fireCurrentInvested, setFireCurrentInvested] = useState(100000);
  const [fireYearsToGoal, setFireYearsToGoal] = useState(15);
  const [fireReturnRate, setFireReturnRate] = useState(12);

  const [xitiqueContribution, setXitiqueContribution] = useState(5000);
  const [xitiqueParticipants, setXitiqueParticipants] = useState(10);
  const [xitiquePosition, setXitiquePosition] = useState(1);

  // Update local salary if global settings change significantly
  useEffect(() => {
    const globalSalary = Number(state.settings?.user_salary || 0);
    if (globalSalary > 0 && globalSalary !== salary) {
      // Usamos um timeout pequeno para evitar cascading renders imediatos que o ESLint marca
      const timer = setTimeout(() => setSalary(globalSalary), 0);
      return () => clearTimeout(timer);
    }
  }, [state.settings?.user_salary]);

  // Keep position within participants bounds
  useEffect(() => {
    if (xitiquePosition > xitiqueParticipants) {
      const timer = setTimeout(() => setXitiquePosition(xitiqueParticipants), 0);
      return () => clearTimeout(timer);
    }
  }, [xitiqueParticipants, xitiquePosition]);

  const safeNeedsPct = Math.min(100, Math.max(0, needsPct));
  const safeWantsPct = Math.min(100 - safeNeedsPct, Math.max(0, wantsPct));
  const savingsPct = Math.max(0, 100 - safeNeedsPct - safeWantsPct);

  const budgetBreakdown = useMemo(() => {
    const safeSalary = Math.max(0, Number(salary || 0));
    return {
      needs: safeSalary * (safeNeedsPct / 100),
      wants: safeSalary * (safeWantsPct / 100),
      savings: safeSalary * (savingsPct / 100),
    };
  }, [salary, safeNeedsPct, safeWantsPct, savingsPct]);

  const budgetPieData = [
    { name: t('simulators.budget.categories.essencial'), value: budgetBreakdown.needs, color: 'var(--color-ocean)' },
    { name: t('simulators.budget.categories.lifestyle'), value: budgetBreakdown.wants, color: 'var(--color-gold)' },
    { name: t('simulators.budget.categories.future'), value: budgetBreakdown.savings, color: 'var(--color-leaf)' },
  ];

  const investmentData = calcCompoundInterest(investmentPrincipal, investmentMonthly, investmentRate, investmentYears);
  const investmentSummary = investmentData[investmentData.length - 1] || { balance: 0, invested: 0 };
  const investmentChartData = investmentData.filter((point, index) => index % 12 === 0 || index === investmentData.length - 1);

  const fireTarget = Math.max(0, fireMonthlyNeed) * 12 * 25;
  const fireMonthlyNeeded = solveMonthlyContributionForTarget(fireTarget, fireCurrentInvested, fireReturnRate, fireYearsToGoal);
  const fireProjection = calcCompoundInterest(fireCurrentInvested, fireMonthlyNeeded, fireReturnRate, fireYearsToGoal);
  const fireProjectedBalance = fireProjection[fireProjection.length - 1]?.balance || 0;
  const fireProgress = fireTarget > 0 ? Math.min(100, (fireCurrentInvested / fireTarget) * 100) : 0;
  const fireChartData = fireProjection.filter((point, index) => index % 12 === 0 || index === fireProjection.length - 1);

  const xitiquePool = xitiqueContribution * xitiqueParticipants;
  const xitiqueMonthsUntilReceive = Math.max(0, xitiquePosition - 1);
  const xitiqueInstallmentWindow = Math.max(1, xitiqueParticipants - 1);
  const xitiqueEquivalentBankInterest = xitiquePool * 0.26 * (xitiqueInstallmentWindow / 12);
  const xitiqueLiquidityGain = Math.max(0, xitiquePool - xitiqueContribution);

  const applyBudgetModel = () => {
    dispatch({
      type: 'APPLY_SALARY_BUDGET',
      payload: {
        needs: budgetBreakdown.needs,
        wants: budgetBreakdown.wants,
        savings: budgetBreakdown.savings,
      },
    });
    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'user_salary', value: Math.max(0, Number(salary || 0)) } });
    showToast(t('simulators.budget.toast_applied'));
  };

  const setBudgetPreset = (preset) => {
    const [needs, wants] = preset.split('/').map(Number);
    setNeedsPct(needs);
    setWantsPct(wants);
    setActiveModel(preset);
  };

  return (
    <div className="w-full flex-1 flex flex-col pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-midnight dark:text-white mb-2 font-display">{t('simulators.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('simulators.description')}</p>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto p-1.5 rounded-[20px] bg-white/5 border border-white/5">
        <TabButton active={activeTab === 'budget'} icon={Banknote} label={t('simulators.tabs.budget')} onClick={() => setActiveTab('budget')} />
        <TabButton active={activeTab === 'invest'} icon={TrendingUp} label={t('simulators.tabs.invest')} onClick={() => setActiveTab('invest')} />
        <TabButton active={activeTab === 'fire'} icon={Flame} label={t('simulators.tabs.fire')} onClick={() => setActiveTab('fire')} />
        <TabButton active={activeTab === 'xitique'} icon={RefreshCcw} label={t('simulators.tabs.xitique')} onClick={() => setActiveTab('xitique')} />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'budget' && (
          <motion.div key="budget" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="glass-card p-6 rounded-[28px] border border-white/5 shadow-2xl">
            <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 min-w-0">
              <div className="space-y-6 min-w-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-ocean/10 flex items-center justify-center text-ocean"><Banknote size={20} /></div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-midnight dark:text-white">{t('simulators.budget.title')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('simulators.budget.subtitle')}</p>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2 block">{t('simulators.budget.salary_label')}</label>
                  <div className="relative">
                    <input type="number" value={salary} onChange={(e) => setSalary(Number(e.target.value))} className="w-full bg-black/5 dark:bg-white/5 border-none rounded-2xl p-4 pr-4 pl-14 text-lg font-black dark:text-white outline-none focus:ring-2 ring-ocean/50" />
                    <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap min-w-0">
                  {['50/30/20', '70/20/10', '60/30/10'].map((preset) => (
                    <button key={preset} onClick={() => setBudgetPreset(preset)} className={`px-4 py-2 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all max-w-full ${activeModel === preset ? 'bg-ocean text-white shadow-lg' : 'bg-black/5 dark:bg-white/5 text-gray-400'}`}>
                      {preset}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5">
                    <div className="flex justify-between mb-2 text-sm font-bold dark:text-white"><span>{t('simulators.budget.categories.needs')}</span><span>{safeNeedsPct}%</span></div>
                    <input type="range" min="20" max="80" step="5" value={safeNeedsPct} onChange={(e) => { setNeedsPct(Number(e.target.value)); setActiveModel('personalizado'); }} className="w-full accent-ocean" />
                  </div>
                  <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5">
                    <div className="flex justify-between mb-2 text-sm font-bold dark:text-white"><span>{t('simulators.budget.categories.wants')}</span><span>{safeWantsPct}%</span></div>
                    <input type="range" min="0" max={100 - safeNeedsPct} step="5" value={safeWantsPct} onChange={(e) => { setWantsPct(Number(e.target.value)); setActiveModel('personalizado'); }} className="w-full accent-gold" />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 min-w-0">
                  {budgetPieData.map((item) => (
                    <div key={item.name} className="p-5 rounded-[24px] bg-black/5 dark:bg-white/5 border border-white/5 min-w-0 overflow-hidden">
                      <div className="flex items-start gap-3 min-w-0">
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: item.color, marginTop: 6, flexShrink: 0 }} />
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase text-gray-400 mb-1 wrap-anywhere">{item.name}</div>
                          <div className="text-lg md:text-xl font-black dark:text-white wrap-anywhere leading-tight">{fmt(item.value, currency)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={applyBudgetModel} className="btn btn-primary px-5 py-3 text-sm font-black">
                  {t('simulators.budget.apply_btn')}
                </button>
              </div>

              <div className="rounded-[28px] bg-black/5 dark:bg-white/5 border border-white/5 p-6 md:p-7 min-w-0 h-full flex flex-col gap-4">
                <div className="text-sm font-black text-midnight dark:text-white wrap-anywhere leading-6">{t('simulators.budget.distribution_title')}</div>
                <div className="w-full grow flex items-center justify-center min-w-0" style={{ height: 240, minHeight: 240 }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie data={budgetPieData} dataKey="value" innerRadius={65} outerRadius={95} paddingAngle={4}>
                        {budgetPieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <RTooltip formatter={(value) => fmt(value, currency)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 leading-6 wrap-anywhere pb-1">
                  <Trans i18nKey="simulators.budget.savings_projection" values={{ pct: savingsPct }} components={{ strong: <strong className="text-leaf" /> }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'invest' && (
          <motion.div key="invest" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="glass-card p-6 rounded-[28px] border border-white/5 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-leaf/10 flex items-center justify-center text-leaf"><TrendingUp size={20} /></div>
              <div>
                <h2 className="text-xl font-black text-midnight dark:text-white">{t('simulators.invest.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('simulators.invest.subtitle')}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <input type="number" value={investmentPrincipal} onChange={(e) => setInvestmentPrincipal(Number(e.target.value))} className="w-full bg-white/5 p-3 rounded-xl dark:text-white font-bold border-none" placeholder={t('simulators.invest.placeholders.principal')} />
              <input type="number" value={investmentMonthly} onChange={(e) => setInvestmentMonthly(Number(e.target.value))} className="w-full bg-white/5 p-3 rounded-xl dark:text-white font-bold border-none" placeholder={t('simulators.invest.placeholders.monthly')} />
              <input type="number" value={investmentRate} onChange={(e) => setInvestmentRate(Number(e.target.value))} className="w-full bg-white/5 p-3 rounded-xl dark:text-white font-bold border-none" placeholder={t('simulators.invest.placeholders.rate')} />
              <input type="number" value={investmentYears} onChange={(e) => setInvestmentYears(Number(e.target.value))} className="w-full bg-white/5 p-3 rounded-xl dark:text-white font-bold border-none" placeholder={t('simulators.invest.placeholders.years')} />
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="rounded-2xl bg-ocean/5 border border-ocean/10 p-5 text-center">
                <div className="text-[11px] font-black uppercase text-ocean mb-1">{t('simulators.invest.summary.final_balance')}</div>
                <div className="text-2xl font-black dark:text-white">{fmt(investmentSummary.balance, currency)}</div>
              </div>
              <div className="rounded-2xl bg-leaf/5 border border-leaf/10 p-5 text-center">
                <div className="text-[11px] font-black uppercase text-leaf mb-1">{t('simulators.invest.summary.total_invested')}</div>
                <div className="text-2xl font-black dark:text-white">{fmt(investmentSummary.invested, currency)}</div>
              </div>
              <div className="rounded-2xl bg-gold/5 border border-gold/10 p-5 text-center">
                <div className="text-[11px] font-black uppercase text-gold mb-1">{t('simulators.invest.summary.gains')}</div>
                <div className="text-2xl font-black dark:text-white">{fmt(investmentSummary.balance - investmentSummary.invested, currency)}</div>
              </div>
            </div>

            <div className="w-full" style={{ height: 320, minHeight: 320 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={investmentChartData}>
                  <defs>
                    <linearGradient id="investmentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-ocean)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-ocean)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7fa3' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7fa3' }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                  <RTooltip formatter={(value) => fmt(value, currency)} />
                  <Area type="monotone" dataKey="balance" stroke="var(--color-ocean)" strokeWidth={3} fill="url(#investmentGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {activeTab === 'fire' && (
          <motion.div key="fire" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
            <ProGate isPro={isPro} title={t('simulators.pro_gate.title')} description={t('simulators.pro_gate.description')}>
              <div className="glass-card p-6 rounded-[28px] border border-white/5 shadow-2xl">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold"><Flame size={20} /></div>
                  <div>
                    <h2 className="text-xl font-black text-midnight dark:text-white">{t('simulators.fire.title')}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('simulators.fire.subtitle')}</p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8">
                  <div className="space-y-4">
                    <input type="number" value={fireMonthlyNeed} onChange={(e) => setFireMonthlyNeed(Number(e.target.value))} className="w-full bg-white/5 p-4 rounded-2xl dark:text-white font-bold border-none" placeholder={t('simulators.fire.placeholders.monthly_need')} />
                    <input type="number" value={fireCurrentInvested} onChange={(e) => setFireCurrentInvested(Number(e.target.value))} className="w-full bg-white/5 p-4 rounded-2xl dark:text-white font-bold border-none" placeholder={t('simulators.fire.placeholders.current_invested')} />
                    <input type="number" value={fireYearsToGoal} onChange={(e) => setFireYearsToGoal(Number(e.target.value))} className="w-full bg-white/5 p-4 rounded-2xl dark:text-white font-bold border-none" placeholder={t('simulators.fire.placeholders.years_to_goal')} />
                    <input type="number" value={fireReturnRate} onChange={(e) => setFireReturnRate(Number(e.target.value))} className="w-full bg-white/5 p-4 rounded-2xl dark:text-white font-bold border-none" placeholder={t('simulators.fire.placeholders.return_rate')} />

                    <div className="rounded-[24px] bg-gold/5 border border-gold/10 p-5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-gold mb-1">{t('simulators.fire.summary.fire_number')}</div>
                      <div className="text-3xl font-black dark:text-white font-display">{fmt(fireTarget, currency)}</div>
                      <p className="text-xs text-gray-500 mt-3">{t('simulators.fire.summary.fire_explainer', { amount: fmt(fireMonthlyNeed, currency) })}</p>
                    </div>
                  </div>

                  <div className="rounded-[28px] bg-black/10 border border-white/5 p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <Sparkles className="text-gold" size={20} />
                      <div>
                        <div className="text-lg font-black dark:text-white">{t('simulators.fire.insight.title')}</div>
                        <div className="text-xs text-gray-400">{t('simulators.fire.insight.subtitle')}</div>
                      </div>
                    </div>

                    <div className="space-y-5 mb-6">
                      <div>
                        <div className="flex justify-between mb-2 text-sm font-bold text-gray-300">
                          <span>{t('simulators.fire.insight.progress')}</span>
                          <span className="text-gold">{fireProgress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-linear-to-r from-gold to-gold-light" style={{ width: `${fireProgress}%` }} />
                        </div>
                      </div>

                  <div className="grid md:grid-cols-2 gap-4 min-w-0">
                        <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                          <div className="text-[10px] font-black uppercase text-gray-400 mb-1">{t('simulators.fire.insight.suggested_monthly')}</div>
                          <div className="text-2xl font-black text-white">{fmt(fireMonthlyNeeded, currency)}</div>
                        </div>
                        <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                          <div className="text-[10px] font-black uppercase text-gray-400 mb-1">{t('simulators.fire.insight.projected_balance')}</div>
                          <div className="text-2xl font-black text-white">{fmt(fireProjectedBalance, currency)}</div>
                        </div>
                      </div>

                      <div className="text-sm text-gray-400 leading-7">
                        <Trans i18nKey="simulators.fire.insight.explainer" 
                          values={{ target: fmt(fireTarget, currency), years: fireYearsToGoal, monthly: fmt(fireMonthlyNeeded, currency), rate: fireReturnRate }} 
                          components={{ strong: <strong className="text-white" /> }} 
                        />
                      </div>
                    </div>

                    <div className="w-full" style={{ height: 220, minHeight: 220 }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={fireChartData}>
                          <defs>
                            <linearGradient id="fireGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-gold)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="var(--color-gold)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                          <RTooltip formatter={(value) => fmt(value, currency)} />
                          <Area type="monotone" dataKey="balance" stroke="var(--color-gold)" strokeWidth={3} fill="url(#fireGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </ProGate>
          </motion.div>
        )}

        {activeTab === 'xitique' && (
          <motion.div key="xitique" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="glass-card p-6 rounded-[28px] border border-white/5 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-sky/10 flex items-center justify-center text-sky"><RefreshCcw size={20} /></div>
              <div>
                <h2 className="text-xl font-black text-midnight dark:text-white">{t('simulators.xitique.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('simulators.xitique.subtitle')}</p>
              </div>
            </div>

            <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8">
              <div className="space-y-5">
                <div className="rounded-[24px] bg-white/5 border border-white/5 p-5">
                  <div className="flex justify-between text-xs mb-2"><span className="text-gray-400">{t('simulators.xitique.labels.monthly_contribution')}</span><span className="font-bold text-white">{fmt(xitiqueContribution, currency)}</span></div>
                  <input type="range" min="1000" max="30000" step="500" value={xitiqueContribution} onChange={(e) => setXitiqueContribution(Number(e.target.value))} className="w-full accent-sky" />
                </div>
                <div className="rounded-[24px] bg-white/5 border border-white/5 p-5">
                  <div className="flex justify-between text-xs mb-2"><span className="text-gray-400">{t('simulators.xitique.labels.participants')}</span><span className="font-bold text-white">{xitiqueParticipants}</span></div>
                  <input type="range" min="2" max="24" value={xitiqueParticipants} onChange={(e) => setXitiqueParticipants(Number(e.target.value))} className="w-full accent-sky" />
                </div>
                <div className="rounded-[24px] bg-white/5 border border-white/5 p-5">
                  <div className="flex justify-between text-xs mb-2"><span className="text-gray-400">{t('simulators.xitique.labels.position')}</span><span className="font-bold text-white">{xitiquePosition}{t('simulators.xitique.labels.position_suffix')}</span></div>
                  <input type="range" min="1" max={xitiqueParticipants} value={xitiquePosition} onChange={(e) => setXitiquePosition(Number(e.target.value))} className="w-full accent-sky" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 content-start">
                <div className="rounded-[24px] bg-ocean/5 border border-ocean/10 p-5">
                  <div className="text-[10px] font-black uppercase text-ocean mb-1">{t('simulators.xitique.summary.circle_amount')}</div>
                  <div className="text-2xl font-black dark:text-white">{fmt(xitiquePool, currency)}</div>
                </div>
                <div className="rounded-[24px] bg-gold/5 border border-gold/10 p-5">
                  <div className="text-[10px] font-black uppercase text-gold mb-1">{t('simulators.xitique.summary.months_to_receive')}</div>
                  <div className="text-2xl font-black dark:text-white">{xitiqueMonthsUntilReceive}</div>
                </div>
                <div className="rounded-[24px] bg-leaf/5 border border-leaf/10 p-5">
                  <div className="text-[10px] font-black uppercase text-leaf mb-1">{t('simulators.xitique.summary.immediate_liquidity')}</div>
                  <div className="text-2xl font-black dark:text-white">{fmt(xitiqueLiquidityGain, currency)}</div>
                </div>
                <div className="rounded-[24px] bg-coral/5 border border-coral/10 p-5">
                  <div className="text-[10px] font-black uppercase text-coral mb-1">{t('simulators.xitique.summary.avoided_interest')}</div>
                  <div className="text-2xl font-black dark:text-white">{fmt(xitiqueEquivalentBankInterest, currency)}</div>
                </div>

                <div className="md:col-span-2 rounded-[28px] bg-black/5 dark:bg-white/5 border border-white/5 p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-full bg-ocean/20 flex items-center justify-center text-ocean shrink-0"><Check size={20} /></div>
                    <div>
                      <div className="text-lg font-black dark:text-white">{t('simulators.xitique.insights.quick_read_title')}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 leading-7">
                        <Trans 
                          i18nKey="simulators.xitique.insights.quick_read_msg" 
                          values={{ position: xitiquePosition, months: xitiqueMonthsUntilReceive, plural: xitiqueMonthsUntilReceive === 1 ? '' : 'es', amount: fmt(xitiquePool, currency) }} 
                          components={{ strong: <strong className="text-white" /> }} 
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-full bg-gold/20 flex items-center justify-center text-gold shrink-0"><Info size={20} /></div>
                    <div>
                      <div className="text-lg font-black dark:text-white">{t('simulators.xitique.insights.credit_comp_title')}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 leading-7">
                        <Trans 
                          i18nKey="simulators.xitique.insights.credit_comp_msg" 
                          values={{ amount: fmt(xitiqueEquivalentBankInterest, currency) }} 
                          components={{ strong: <strong className="text-white" /> }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 p-6 rounded-[28px] bg-amber-500/5 border border-amber-500/10 flex gap-4">
        <Info className="text-amber-500 shrink-0" size={24} />
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <Trans i18nKey="simulators.disclaimer" components={{ strong: <strong className="text-amber-500/80" /> }} />
        </div>
      </div>
    </div>
  );
}
