import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { calcCompoundInterest, fmt } from '../../utils/calculations';
import { useState } from 'react';

export default function SimulatorInvest({ currency }) {
  const { t } = useTranslation();

  const [principal, setPrincipal] = useState(50000);
  const [monthly,   setMonthly]   = useState(10000);
  const [rate,      setRate]      = useState(12);
  const [years,     setYears]     = useState(10);

  const data    = calcCompoundInterest(principal, monthly, rate, years);
  const summary = data[data.length - 1] || { balance: 0, invested: 0 };
  const chartData = data.filter((_, i) => i % 12 === 0 || i === data.length - 1);

  return (
    <motion.div
      key="invest"
      initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
      className="glass-card p-6 rounded-[28px] border border-white/5 shadow-2xl"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-leaf/10 flex items-center justify-center text-leaf"><TrendingUp size={20} /></div>
        <div>
          <h2 className="text-xl font-black text-midnight dark:text-white">{t('simulators.invest.title')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('simulators.invest.subtitle')}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <input type="number" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} className="w-full bg-white/5 p-3 rounded-xl dark:text-white font-bold border-none" placeholder={t('simulators.invest.placeholders.principal')} />
        <input type="number" value={monthly}   onChange={(e) => setMonthly(Number(e.target.value))}   className="w-full bg-white/5 p-3 rounded-xl dark:text-white font-bold border-none" placeholder={t('simulators.invest.placeholders.monthly')} />
        <input type="number" value={rate}      onChange={(e) => setRate(Number(e.target.value))}      className="w-full bg-white/5 p-3 rounded-xl dark:text-white font-bold border-none" placeholder={t('simulators.invest.placeholders.rate')} />
        <input type="number" value={years}     onChange={(e) => setYears(Number(e.target.value))}     className="w-full bg-white/5 p-3 rounded-xl dark:text-white font-bold border-none" placeholder={t('simulators.invest.placeholders.years')} />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-ocean/5 border border-ocean/10 p-5 text-center">
          <div className="text-[11px] font-black uppercase text-ocean mb-1">{t('simulators.invest.summary.final_balance')}</div>
          <div className="text-2xl font-black dark:text-white">{fmt(summary.balance, currency)}</div>
        </div>
        <div className="rounded-2xl bg-leaf/5 border border-leaf/10 p-5 text-center">
          <div className="text-[11px] font-black uppercase text-leaf mb-1">{t('simulators.invest.summary.total_invested')}</div>
          <div className="text-2xl font-black dark:text-white">{fmt(summary.invested, currency)}</div>
        </div>
        <div className="rounded-2xl bg-gold/5 border border-gold/10 p-5 text-center">
          <div className="text-[11px] font-black uppercase text-gold mb-1">{t('simulators.invest.summary.gains')}</div>
          <div className="text-2xl font-black dark:text-white">{fmt(summary.balance - summary.invested, currency)}</div>
        </div>
      </div>

      <div className="w-full min-w-0 flex flex-col" style={{ height: 320, minHeight: 320 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="investmentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="var(--color-ocean)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-ocean)" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7fa3' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7fa3' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <RTooltip formatter={(v) => fmt(v, currency)} />
            <Area type="monotone" dataKey="balance" stroke="var(--color-ocean)" strokeWidth={3} fill="url(#investmentGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
