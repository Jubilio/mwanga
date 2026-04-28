import { useEffect, useMemo, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Banknote, Wallet } from 'lucide-react';
import { Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { fmt } from '../../utils/calculations';

export default function SimulatorBudget({ salary: globalSalary, currency, dispatch, showToast }) {
  const { t } = useTranslation();

  const [salary, setSalary] = useState(() => Math.max(0, Number(globalSalary || 50000)));
  const [needsPct, setNeedsPct] = useState(50);
  const [wantsPct, setWantsPct] = useState(30);
  const [activeModel, setActiveModel] = useState('50/30/20');

  // Sync with global salary when it changes meaningfully
  useEffect(() => {
    const g = Number(globalSalary || 0);
    if (g > 0 && g !== salary) {
      const t = setTimeout(() => setSalary(g), 0);
      return () => clearTimeout(t);
    }
  }, [globalSalary]);

  const safeNeedsPct  = Math.min(100, Math.max(0, needsPct));
  const safeWantsPct  = Math.min(100 - safeNeedsPct, Math.max(0, wantsPct));
  const savingsPct    = Math.max(0, 100 - safeNeedsPct - safeWantsPct);

  const budgetBreakdown = useMemo(() => {
    const s = Math.max(0, Number(salary || 0));
    return {
      needs:   s * (safeNeedsPct / 100),
      wants:   s * (safeWantsPct / 100),
      savings: s * (savingsPct  / 100),
    };
  }, [salary, safeNeedsPct, safeWantsPct, savingsPct]);

  const pieData = [
    { name: t('simulators.budget.categories.essencial'), value: budgetBreakdown.needs,   color: 'var(--color-ocean)' },
    { name: t('simulators.budget.categories.lifestyle'), value: budgetBreakdown.wants,   color: 'var(--color-gold)'  },
    { name: t('simulators.budget.categories.future'),   value: budgetBreakdown.savings, color: 'var(--color-leaf)'  },
  ];

  function applyBudgetModel() {
    dispatch({
      type: 'APPLY_SALARY_BUDGET',
      payload: { needs: budgetBreakdown.needs, wants: budgetBreakdown.wants, savings: budgetBreakdown.savings },
    });
    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'user_salary', value: Math.max(0, Number(salary || 0)) } });
    showToast(t('simulators.budget.toast_applied'));
  }

  function setBudgetPreset(preset) {
    const [needs, wants] = preset.split('/').map(Number);
    setNeedsPct(needs);
    setWantsPct(wants);
    setActiveModel(preset);
  }

  return (
    <motion.div
      key="budget"
      initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
      className="glass-card p-6 rounded-[28px] border border-white/5 shadow-2xl"
    >
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
            {pieData.map((item) => (
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
          <div className="w-full grow flex items-center justify-center min-w-0 flex-1" style={{ height: 240, minHeight: 240 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={65} outerRadius={95} paddingAngle={4}>
                  {pieData.map((entry) => (<Cell key={entry.name} fill={entry.color} />))}
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
  );
}
