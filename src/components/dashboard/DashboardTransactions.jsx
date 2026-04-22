import { ArrowDownToLine, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { fmt } from '../../utils/calculations';

export default function DashboardTransactions({ latestTransactions, navigate, showBalance, currency, itemVariants, t }) {
  return (
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
               {showBalance ? `${t.tipo === 'despesa' ? '-' : '+'}${fmt(t.valor, currency)}` : '••••'}
             </span>
          </div>
        ))}

        {latestTransactions.length === 0 && (
          <div className="py-12 text-center">
             <span className="text-3xl opacity-20">📝</span>
             <p className="mt-2 text-xs font-bold text-slate-400">Sem registos recentes</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
