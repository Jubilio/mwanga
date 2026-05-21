import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Banknote, Wallet, Layers } from 'lucide-react';
import { Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { fmt } from '../../utils/calculations';

export default function SimulatorEstrutura({ salary: globalSalary, currency, dispatch, showToast }) {
  const { t } = useTranslation();
  const [salary, setSalary] = useState(() => Math.max(0, Number(globalSalary || 25000)));

  useEffect(() => {
    const g = Number(globalSalary || 0);
    if (g > 0 && g !== salary) {
      const t = setTimeout(() => setSalary(g), 0);
      return () => clearTimeout(t);
    }
  }, [globalSalary]);

  const structure = [
    { name: 'Dízimo', percent: 10, color: '#a855f7' },
    { name: 'Pagar-se primeiro', percent: 5, color: '#f59e0b' },
    { name: 'Despesas', percent: 50, color: 'var(--color-ocean)' },
    { name: 'Poupança', percent: 10, color: 'var(--color-leaf)' },
    { name: 'Investimento', percent: 10, color: 'var(--color-gold)' },
    { name: 'Conhecimento', percent: 5, color: '#3b82f6' },
    { name: 'Ação social', percent: 5, color: 'var(--color-coral)' },
    { name: 'Abundar', percent: 5, color: '#ec4899' }
  ];

  const pieData = useMemo(() => {
    const s = Math.max(0, Number(salary || 0));
    return structure.map(item => ({
      name: item.name,
      value: s * (item.percent / 100),
      color: item.color,
      percent: item.percent
    }));
  }, [salary]);

  function applySalary() {
    dispatch({ type: 'UPDATE_SETTING', payload: { key: 'user_salary', value: Math.max(0, Number(salary || 0)) } });
    showToast('Salário e estrutura atualizados!');
  }

  return (
    <motion.div
      key="estrutura"
      initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
      className="glass-card p-6 rounded-[28px] border border-white/5 shadow-2xl"
    >
      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 min-w-0">
        <div className="space-y-6 min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-ocean/10 flex items-center justify-center text-ocean"><Layers size={20} /></div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-midnight dark:text-white">Estrutura Financeira</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Modelo financeiro de 8 categorias baseado em Arcélio Tivane</p>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2 block">Salário Base (MZN)</label>
            <div className="relative">
              <input type="number" value={salary} onChange={(e) => setSalary(Number(e.target.value))} className="w-full bg-black/5 dark:bg-white/5 border-none rounded-2xl p-4 pr-4 pl-14 text-lg font-black dark:text-white outline-none focus:ring-2 ring-ocean/50" />
              <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 min-w-0">
            {pieData.map((item) => (
              <div key={item.name} className="p-3.5 rounded-[16px] bg-black/5 dark:bg-white/5 border border-white/5 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-1">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <div className="text-[10px] font-black uppercase text-gray-500 line-clamp-1">{item.name} ({item.percent}%)</div>
                </div>
                <div className="text-sm md:text-base font-black dark:text-white pl-4 truncate">{fmt(item.value, currency)}</div>
              </div>
            ))}
          </div>

          <button onClick={applySalary} className="btn btn-primary px-5 py-3 text-sm font-black w-full">
            Aplicar Configuração
          </button>
        </div>

        <div className="rounded-[28px] bg-black/5 dark:bg-white/5 border border-white/5 p-6 h-full flex flex-col items-center justify-center min-w-0">
          <div className="w-full grow flex items-center justify-center" style={{ height: 280, minHeight: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" innerRadius={70} outerRadius={110} paddingAngle={2}>
                  {pieData.map((entry) => (<Cell key={entry.name} fill={entry.color} />))}
                </Pie>
                <RTooltip formatter={(value) => fmt(value, currency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xl md:text-2xl font-black text-midnight dark:text-white">{fmt(salary, currency)}</p>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-black mt-1">Total Distribuído</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
