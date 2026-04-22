import { ShieldCheck, ChevronRight, Sparkles, Bell, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { fmt } from '../../utils/calculations';

export function HealthCard({ navigate, score, scoreColor, scoreLabel, itemVariants, t }) {
  return (
    <motion.div 
      variants={itemVariants}
      onClick={() => navigate('/insights')}
      className="glass-card group flex flex-col justify-between overflow-hidden p-5 cursor-pointer min-h-[160px]"
    >
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ocean/10 text-ocean dark:bg-sky/10 dark:text-sky">
              <ShieldCheck size={18} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Saúde Financeira</span>
         </div>
         <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1" />
      </div>
      
      <div className="mt-4 flex items-baseline gap-2">
         <span className={`text-4xl font-black ${scoreColor}`}>{score}</span>
         <span className="text-xs font-bold text-slate-400">/ 100</span>
      </div>
      
      <div className="mt-2 flex items-center gap-2">
         <Sparkles size={12} className={scoreColor} />
         <span className={`text-[10px] font-black uppercase tracking-wider ${scoreColor}`}>{scoreLabel}</span>
      </div>

      <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
         <motion.div 
           initial={{ width: 0 }}
           animate={{ width: `${score}%` }}
           transition={{ duration: 1, ease: 'easeOut' }}
           className={`h-full bg-linear-to-r ${score > 70 ? 'from-leaf to-leaf-light' : score > 40 ? 'from-gold to-gold-light' : 'from-coral to-coral-light'}`}
         />
      </div>
    </motion.div>
  );
}

export function AlertsCard({ navigate, totalAlerts, pendingDebts, pendingHousing, itemVariants }) {
  return (
    <motion.div 
      variants={itemVariants}
      onClick={() => navigate(totalAlerts > 0 ? '/dividas' : '/patrimonio')}
      className="glass-card group flex flex-col justify-between p-6 cursor-pointer"
    >
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${totalAlerts > 0 ? 'bg-coral/10 text-coral animate-pulse' : 'bg-leaf/10 text-leaf'}`}>
              <Bell size={20} />
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Alertas & Pendentes</span>
         </div>
         <ChevronRight size={18} className="text-slate-300 transition-transform group-hover:translate-x-1" />
      </div>

      <div className="mt-8">
         {totalAlerts > 0 ? (
           <div className="space-y-3">
              <span className="text-5xl font-black text-coral">{totalAlerts}</span>
              <div className="flex flex-col gap-1">
                {pendingDebts > 0 && <span className="text-[10px] font-bold text-coral/80 uppercase tracking-wider">● {pendingDebts} Dívidas Pendentes</span>}
                {pendingHousing > 0 && <span className="text-[10px] font-bold text-gold/80 uppercase tracking-wider">● {pendingHousing} Despesas de Habitação</span>}
              </div>
           </div>
         ) : (
           <div className="space-y-3">
              <span className="text-5xl font-black text-leaf-light">0</span>
              <span className="block text-[10px] font-bold text-leaf/60 uppercase tracking-wider">Tudo sob controlo</span>
           </div>
         )}
      </div>
      
      <div className="mt-6 h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/5" />
    </motion.div>
  );
}

export function AccountsCard({ navigate, state, showBalance, currency, maxContaBalance, totalContas, itemVariants }) {
  return (
    <motion.div
      variants={itemVariants}
      onClick={() => navigate('/patrimonio')}
      className="glass-card group flex flex-col gap-4 p-5 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ocean/10 text-ocean dark:bg-sky/10 dark:text-sky">
            <Wallet size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Contas Activas</span>
        </div>
        <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1" />
      </div>

      {state.contas?.length > 0 ? (
        <div className="flex flex-col gap-3">
          {state.contas
            .filter(conta => Number(conta.current_balance || 0) > 0)
            .sort((a, b) => Number(b.current_balance || 0) - Number(a.current_balance || 0))
            .slice(0, 4)
            .map((conta) => {
              const pct = Math.min((Number(conta.current_balance || 0) / maxContaBalance) * 100, 100);
              return (
                <div key={conta.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[55%]">{conta.name}</span>
                    <span className="text-xs font-black tabular-nums text-midnight dark:text-white">
                      {showBalance ? fmt(conta.current_balance, currency) : '••••'}
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-linear-to-r from-ocean/40 to-sky"
                    />
                  </div>
                </div>
              );
            })}
          {state.contas.filter(c => Number(c.current_balance || 0) > 0).length > 4 && (
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              +{state.contas.filter(c => Number(c.current_balance || 0) > 0).length - 4} contas...
            </span>
          )}
          {state.contas.filter(c => Number(c.current_balance || 0) > 0).length === 0 && (
            <div className="py-4 text-center text-xs text-slate-400 italic">Todas as contas com saldo zero</div>
          )}
        </div>
      ) : (
        <div className="py-4 text-center text-xs text-slate-400">Sem contas registadas</div>
      )}

      <div className="mt-auto flex items-baseline gap-1 border-t border-slate-100 dark:border-white/5 pt-3">
        <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Total em Contas</span>
        <span className="ml-auto text-base font-black text-midnight dark:text-white tabular-nums">
          {showBalance ? fmt(totalContas, currency) : '••••'}
        </span>
      </div>
    </motion.div>
  );
}

export function CashFlowCard({ navigate, totals, showBalance, currency, savingsRate, itemVariants }) {
  return (
    <motion.div
      variants={itemVariants}
      onClick={() => navigate('/insights')}
      className="glass-card group flex flex-col gap-4 p-5 cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${totals.saldo >= 0 ? 'bg-leaf/10 text-leaf' : 'bg-coral/10 text-coral'}`}>
            {totals.saldo >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Fluxo de Caixa</span>
        </div>
        <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-1" />
      </div>

      {/* Big Flow Number */}
      <div className="flex flex-col">
        <span className={`text-3xl font-black tabular-nums ${totals.saldo >= 0 ? 'text-leaf-light' : 'text-coral-light'}`}>
          {showBalance ? `${totals.saldo >= 0 ? '+' : ''}${fmt(totals.saldo, currency)}` : '•••••'}
        </span>
        <span className={`text-[9px] font-black uppercase tracking-widest mt-1 ${totals.saldo >= 0 ? 'text-leaf/60' : 'text-coral/60'}`}>
          {totals.saldo >= 0 ? '✓ Mês positivo' : '⚠ Despesas acima dos rendimentos'}
        </span>
      </div>

      {/* Income vs Expense mini bars */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="w-16 text-[9px] font-black uppercase tracking-widest text-leaf-light/70 shrink-0">Entradas</span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              className="h-full bg-linear-to-r from-leaf/30 to-leaf-light"
            />
          </div>
          <span className="text-[9px] font-black tabular-nums text-leaf-light shrink-0">
             {showBalance ? fmt(totals.totalIncome, currency) : '••••'}
           </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-16 text-[9px] font-black uppercase tracking-widest text-coral-light/70 shrink-0">Saídas</span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((totals.totalExpenses / Math.max(totals.totalIncome, 1)) * 100, 100)}%` }}
              className="h-full bg-linear-to-r from-coral/30 to-coral-light"
            />
          </div>
          <span className="text-[9px] font-black tabular-nums text-coral-light shrink-0">
             {showBalance ? fmt(totals.totalExpenses, currency) : '••••'}
           </span>
        </div>
      </div>

      {/* Savings Rate */}
      <div className="mt-auto flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-3">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Taxa de Poupança</span>
        <span className={`text-sm font-black ${savingsRate > 20 ? 'text-leaf-light' : savingsRate > 0 ? 'text-gold' : 'text-coral'}`}>
          {savingsRate.toFixed(1)}%
        </span>
      </div>
    </motion.div>
  );
}
