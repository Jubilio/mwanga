import { RefreshCw, Eye, EyeOff, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { fmt } from '../../utils/calculations';

export default function DashboardHero({
  greeting,
  handleRefresh,
  isRefreshing,
  t,
  showBalance,
  toggleBalance,
  formattedBalance,
  currency,
  totals,
  state,
  itemVariants
}) {
  return (
    <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[32px] bg-linear-to-br from-midnight via-[#12232e] to-midnight p-8 shadow-2xl">
      {/* Animated Orbs for Depth */}
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-ocean/10 blur-[100px] animate-pulse" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gold/5 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500/80">{greeting}</span>
          <div className="h-1 w-1 rounded-full bg-gold/50" />
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Actualizar dados"
            className="group p-1 text-gray-500 hover:text-gold transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={10}
              className={`transition-transform duration-500 ${
                isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'
              }`}
            />
          </button>
        </div>

        <span className="mb-2 text-[11px] font-black uppercase tracking-[0.4em] text-sky/60">{t('dashboard.available_balance')}</span>

        <div className="flex w-full flex-col items-center gap-4 px-4 sm:flex-row sm:justify-center">
          <div className="flex items-baseline gap-1 text-white tracking-tighter">
            {showBalance ? (
              <>
                <span className="text-4xl font-black sm:text-5xl">{formattedBalance.integer}</span>
                <span className="text-xl font-bold opacity-30 sm:text-2xl">,{formattedBalance.decimal}</span>
                <span className="ml-2 text-base font-black text-gold-light tracking-widest sm:text-lg">{currency}</span>
              </>
            ) : (
              <span className="text-4xl opacity-10 tracking-[0.4em] font-black sm:text-5xl">•••••</span>
            )}
          </div>
          <button
            onClick={toggleBalance}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-gray-400 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white active:scale-90"
          >
            {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>

        {/* Flow Indicator Chips */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
            <div className={`flex items-center gap-2 rounded-2xl bg-white/5 py-2 px-4 backdrop-blur-xl border border-white/5 ${totals.saldo >= 0 ? 'text-leaf-light' : 'text-coral-light'}`}>
               {totals.saldo >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
               <span className="text-[11px] font-black uppercase tracking-wider tabular-nums">
                 {showBalance ? `${totals.saldo >= 0 ? '+' : ''}${fmt(totals.saldo, currency)}` : '••••'}
               </span>
            </div>
           {state.settings.cash_balance !== undefined && (
             <div className="flex items-center gap-2 rounded-2xl bg-white/5 py-2 px-4 backdrop-blur-xl border border-white/5 text-gold-light">
               <Wallet size={14} />
               <span className="text-[11px] font-black uppercase tracking-wider tabular-nums">
                 {showBalance ? fmt(state.settings.cash_balance, currency) : '••••'} Dinheiro
               </span>
             </div>
           )}
        </div>

        {/* Premium Split-Tile Stats */}
        <div className="mt-10 flex w-full items-stretch border-t border-white/5 pt-6">
          {/* Income Tile */}
          <div className="flex flex-1 flex-col items-center gap-2 px-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-leaf-light/60">Rendimentos</span>
            <span className="text-sm font-black tabular-nums text-leaf-light sm:text-base">
              {showBalance ? fmt(totals.totalIncome, currency) : '••••'}
            </span>
            <div className="mt-1 h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                className="h-full bg-linear-to-r from-leaf-light/40 to-leaf-light" 
              />
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="w-[1px] self-stretch bg-linear-to-b from-transparent via-white/10 to-transparent" />

          {/* Expense Tile */}
          <div className="flex flex-1 flex-col items-center gap-2 px-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-coral-light/60">Despesas</span>
            <span className="text-sm font-black tabular-nums text-coral-light sm:text-base">
              {showBalance ? fmt(totals.totalExpenses, currency) : '••••'}
            </span>
            <div className="mt-1 h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((totals.totalExpenses / Math.max(totals.totalIncome, 1)) * 100, 100)}%` }}
                className="h-full bg-linear-to-r from-coral-light/40 to-coral-light" 
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
