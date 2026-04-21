import { useTranslation } from 'react-i18next';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fmt } from '../utils/calculations';
import { motion } from 'framer-motion';

export default function BalanceTrendChart({ data, currency }) {
  const { t } = useTranslation();
  
  // Se não houver dados, mostramos um estado vazio elegante
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[200px] text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xl mb-3">📈</div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.charts.trend_empty') || 'Tendência não disponível'}</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fluxo de Património</h3>
          <p className="text-xs font-bold text-midnight dark:text-white mt-1">Histórico dos últimos meses</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="h-2 w-2 rounded-full bg-sky" />
           <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Saldo Consolidado</span>
        </div>
      </div>

      <div style={{ width: '100%' }}>
        <ResponsiveContainer width="100%" height={200} minWidth={0}>
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-sky)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--color-sky)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.05)" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }}
              tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
              }}
              itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 800 }}
              labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', marginBottom: '4px' }}
              formatter={(value) => [fmt(value, currency), 'Saldo']}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="var(--color-sky)" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorBalance)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
