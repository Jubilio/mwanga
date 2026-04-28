import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Flame, Sparkles } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { calcCompoundInterest, fmt } from '../../utils/calculations';

function solveMonthlyContribution(targetAmount, currentAmount, annualRate, years) {
  const safeTarget  = Math.max(0, Number(targetAmount  || 0));
  const safeCurrent = Math.max(0, Number(currentAmount || 0));
  const months      = Math.max(1, Math.round(Number(years || 0) * 12));

  if (safeCurrent >= safeTarget) return 0;

  const monthlyRate = Math.max(0, Number(annualRate || 0)) / 100 / 12;
  if (monthlyRate === 0) return Math.max(0, (safeTarget - safeCurrent) / months);

  const growthFactor      = Math.pow(1 + monthlyRate, months);
  const futureValueOfCurrent = safeCurrent * growthFactor;
  if (futureValueOfCurrent >= safeTarget) return 0;

  return Math.max(0, (safeTarget - futureValueOfCurrent) / ((growthFactor - 1) / monthlyRate));
}

export default function SimulatorFire({ currency, isPro }) {
  const { t } = useTranslation();

  const [monthlyNeed,      setMonthlyNeed]      = useState(35000);
  const [currentInvested,  setCurrentInvested]  = useState(100000);
  const [yearsToGoal,      setYearsToGoal]      = useState(15);
  const [returnRate,       setReturnRate]        = useState(12);

  const fireTarget           = Math.max(0, monthlyNeed) * 12 * 25;
  const fireMonthlyNeeded    = solveMonthlyContribution(fireTarget, currentInvested, returnRate, yearsToGoal);
  const fireProjection       = calcCompoundInterest(currentInvested, fireMonthlyNeeded, returnRate, yearsToGoal);
  const fireProjectedBalance = fireProjection[fireProjection.length - 1]?.balance || 0;
  const fireProgress         = fireTarget > 0 ? Math.min(100, (currentInvested / fireTarget) * 100) : 0;
  const chartData            = fireProjection.filter((_, i) => i % 12 === 0 || i === fireProjection.length - 1);

  const content = (
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
          <input type="number" value={monthlyNeed}     onChange={(e) => setMonthlyNeed(Number(e.target.value))}     className="w-full bg-white/5 p-4 rounded-2xl dark:text-white font-bold border-none" placeholder={t('simulators.fire.placeholders.monthly_need')} />
          <input type="number" value={currentInvested} onChange={(e) => setCurrentInvested(Number(e.target.value))} className="w-full bg-white/5 p-4 rounded-2xl dark:text-white font-bold border-none" placeholder={t('simulators.fire.placeholders.current_invested')} />
          <input type="number" value={yearsToGoal}     onChange={(e) => setYearsToGoal(Number(e.target.value))}     className="w-full bg-white/5 p-4 rounded-2xl dark:text-white font-bold border-none" placeholder={t('simulators.fire.placeholders.years_to_goal')} />
          <input type="number" value={returnRate}      onChange={(e) => setReturnRate(Number(e.target.value))}      className="w-full bg-white/5 p-4 rounded-2xl dark:text-white font-bold border-none" placeholder={t('simulators.fire.placeholders.return_rate')} />

          <div className="rounded-[24px] bg-gold/5 border border-gold/10 p-5">
            <div className="text-[10px] font-black uppercase tracking-widest text-gold mb-1">{t('simulators.fire.summary.fire_number')}</div>
            <div className="text-3xl font-black dark:text-white font-display">{fmt(fireTarget, currency)}</div>
            <p className="text-xs text-gray-500 mt-3">{t('simulators.fire.summary.fire_explainer', { amount: fmt(monthlyNeed, currency) })}</p>
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
              <Trans
                i18nKey="simulators.fire.insight.explainer"
                values={{ target: fmt(fireTarget, currency), years: yearsToGoal, monthly: fmt(fireMonthlyNeeded, currency), rate: returnRate }}
                components={{ strong: <strong className="text-white" /> }}
              />
            </div>
          </div>

          <div className="w-full min-w-0 flex flex-col" style={{ height: 220, minHeight: 220 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="fireGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--color-gold)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-gold)" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <RTooltip formatter={(v) => fmt(v, currency)} />
                <Area type="monotone" dataKey="balance" stroke="var(--color-gold)" strokeWidth={3} fill="url(#fireGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isPro) {
    return (
      <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden' }}>
        <div style={{ filter: 'blur(10px)', opacity: 0.2, pointerEvents: 'none' }}>{content}</div>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', gap: 14, padding: 32,
          background: 'rgba(7, 20, 31, 0.72)', backdropFilter: 'blur(6px)',
          border: '1px solid rgba(201, 150, 58, 0.28)',
        }}>
          <div style={{ fontSize: 42 }}>🔒</div>
          <div className="text-center text-xl font-black text-gold font-display">{t('simulators.pro_gate.title')}</div>
          <p className="max-w-[320px] text-center text-sm text-white/70 leading-6">{t('simulators.pro_gate.description')}</p>
          <a href="/pricing" style={{
            padding: '12px 28px', borderRadius: 16, textDecoration: 'none', fontWeight: 900,
            fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em',
            background: 'linear-gradient(135deg, var(--color-gold), var(--color-gold-light))', color: '#08111a',
          }}>
            {t('simulators.pro_gate.btn')}
          </a>
        </div>
      </div>
    );
  }

  return content;
}
