import { ui } from '../../utils/uiTranslation';
import { ArrowUpRight, ArrowDownToLine, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { fmt } from '../../utils/calculations';
import CategoryBadge from '../CategoryBadge';

export default function TransactionsList({ 
  filtered, 
  showBalance, 
  currency, 
  handleEdit, 
  handleDelete, 
  t 
}) {
  return (
    <div className="flex flex-col gap-3">
      {filtered.length === 0 ? (
        <div className="glass-card p-16 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-4xl">📝</div>
          <p className="font-black text-slate-500">{t('transactions.empty')}</p>
        </div>
      ) : (
        filtered.map((tr, idx) => (
          <motion.div 
            key={tr.id} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: idx * 0.03 }} 
            className="glass-card p-3 sm:p-4 flex items-center justify-between gap-2 sm:gap-3 group hover:bg-white/8 transition-all"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <div className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl ${tr.tipo === 'receita' ? 'bg-leaf/10 text-leaf' : 'bg-coral/10 text-coral'}`}>
                {tr.tipo === 'receita' ? <ArrowUpRight size={20} /> : <ArrowDownToLine size={20} />}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold text-midnight dark:text-white leading-tight truncate">{tr.desc}</span>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="whitespace-nowrap text-[9px] font-black uppercase tracking-widest text-slate-400">{tr.data}</span>
                  <CategoryBadge category={tr.cat} />
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
              <span className={`whitespace-nowrap text-sm sm:text-base font-black tabular-nums ${tr.tipo === 'receita' ? 'text-leaf' : 'text-midnight dark:text-white'}`}>
                {showBalance ? `${tr.tipo === 'receita' ? '+' : '-'}${fmt(tr.valor, currency)}` : '••••'}
              </span>
              {/* Always visible on touch screens: there is no hover on a phone. */}
              <div className="flex items-center gap-1 transition-all md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                <button onClick={() => handleEdit(tr)} aria-label={ui("Editar")} className="rounded-lg p-1.5 text-slate-400 hover:text-ocean"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(tr.id)} aria-label={ui("Eliminar")} className="rounded-lg p-1.5 text-slate-400 hover:text-coral"><Trash2 size={14} /></button>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}
