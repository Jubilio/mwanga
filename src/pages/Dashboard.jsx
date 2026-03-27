/* eslint-disable no-unused-vars */
import {
  Bell,
  Wallet,
  Eye,
  EyeOff,
  Plus,
  ArrowUpRight,
  ArrowDownToLine,
  Coins,
  CreditCard,
  ShieldCheck,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BinthContextual from '../components/BinthContextual';
import { useFinance } from '../hooks/useFinance';
import {
  calcFinancialScore,
  calcMonthlyTotals,
  calcRiskLevel,
  calcSavingsRate,
  fmt,
  getFinancialMonthKey
} from '../utils/calculations';

const COLORS = ['#e07a5f', '#0a4d68', '#c9963a', '#3d6b45', '#1a8fa8', '#9b59b6', '#e74c3c', '#000000'];

export default function Dashboard() {
  const { state } = useFinance();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);

  const currency = state.settings.currency || 'MT';
  const startDay = state.settings.financial_month_start_day || 1;
  const monthKey = getFinancialMonthKey(new Date(), startDay);

  const totals = calcMonthlyTotals(state.transacoes, monthKey, state.rendas, startDay);
  const score = calcFinancialScore(state.transacoes, state.budgets, monthKey, state.rendas, startDay);
  const risk = calcRiskLevel(score);
  const savingsRate = calcSavingsRate(totals.totalIncome, totals.totalExpenses);
  const totalContas = state.contas?.reduce((acc, curr) => acc + Number(curr.current_balance || 0), 0) || 0;
  const realBalance = totals.saldo + totalContas;
  const pendingHousing = state.rendas.filter(r => r.estado === 'pendente').length;
  const pendingDebts = state.dividas.filter(d => Number(d.remaining_amount || 0) > 0).length;
  const latestTransactions = [...state.transacoes]
    .sort((a, b) => `${b.data || ''}`.localeCompare(`${a.data || ''}`) || Number(b.id || 0) - Number(a.id || 0))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6" style={{ paddingBottom: '7rem' }}>
      
      {/* 1. BALANCE - LARGE AND PROMINENT */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center justify-center pt-8 pb-4 text-center relative"
      >
        <div className="absolute top-2 right-2">
          <button onClick={() => setShowBalance(!showBalance)} className="p-3 rounded-full bg-black/5 dark:bg-white/5 text-gray-500 hover:text-ocean dark:hover:text-sky transition-colors active:scale-95">
            {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-gray-500 dark:text-gray-400 mb-2">Balanço Disponível</span>
        <div className="text-4xl xs:text-5xl font-extrabold text-midnight dark:text-white tracking-tight flex items-center justify-center h-16 w-full px-2">
          {showBalance ? (
            <span>{fmt(realBalance, currency)}</span>
          ) : (
            <span className="tracking-[0.5em] mt-2">••••••</span>
          )}
        </div>
        <div className={`mt-5 flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-full ${totals.saldo >= 0 ? 'bg-leaf/10 text-leaf dark:text-leaf-light' : 'bg-coral/10 text-coral'}`}>
          {totals.saldo >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {totals.saldo >= 0 ? '+' : '-'}{fmt(Math.abs(totals.saldo), currency)} fluxo mensal
        </div>
      </motion.div>

      {/* 2. QUICK ACTIONS (Horizontal Scroll) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
        className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        <QuickActionButton 
          icon={ArrowUpRight} label="Enviar" 
          color="bg-ocean hover:bg-ocean-light dark:bg-sky dark:hover:bg-sky-light text-white" 
          onClick={() => navigate('/transacoes')}
        />
        <QuickActionButton 
          icon={Plus} label="Despesa" 
          color="bg-coral hover:bg-coral-light text-white" 
          onClick={() => navigate('/transacoes')}
        />
        <QuickActionButton 
          icon={ArrowDownToLine} label="Receber" 
          color="bg-black/10 hover:bg-black/15 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white" 
          onClick={() => navigate('/transacoes')}
        />
        <QuickActionButton 
          icon={Coins} label="Xitique" 
          color="bg-gold hover:bg-gold-light text-white" 
          onClick={() => navigate('/xitique')}
        />
        <QuickActionButton 
          icon={CreditCard} label="Crédito" 
          color="bg-[#0a1926] hover:bg-[#12232e] text-white" 
          onClick={() => navigate('/credito')}
        />
      </motion.div>

      {/* 3. AI INSIGHTS (BINTH) */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
        <BinthContextual page="dashboard" />
      </motion.div>

      {/* 4. CARDS (Vertical Scrollable) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }} 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Cashflow Card */}
        <DashboardCard 
          title="Fluxo de Caixa" icon={ArrowRightLeft}
          value={fmt(totals.totalIncome, currency)} label="Receitas" valueTone="text-leaf dark:text-leaf-light"
          subValue={fmt(totals.totalExpenses, currency)} subLabel="Despesas" subTone="text-coral dark:text-coral-light"
          onClick={() => navigate('/transacoes')}
        />
        {/* Active Accounts Card */}
        <DashboardCard 
          title="Contas Activas" icon={Wallet}
          value={fmt(totalContas, currency)} label="Saldos" valueTone="text-ocean dark:text-sky"
          subValue={`${state.contas?.length || 0} contas`} subLabel="M-Pesa, Bancos..." subTone="text-gray-500"
          onClick={() => navigate('/patrimonio')}
        />
        {/* Financial Health Score */}
        <DashboardCard 
          title="Saúde Financeira" icon={ShieldCheck}
          value={`${score}/100`} label={`Risco ${risk.level}`} valueTone={score > 70 ? 'text-leaf' : 'text-gold'}
          subValue={`${savingsRate}%`} subLabel="Taxa Poupança" subTone="text-gray-500"
          onClick={() => navigate('/insights')}
        />
        {/* Pending Alerts Card */}
        <DashboardCard 
          title="Alertas & Pendências" icon={Bell}
          value={String(pendingDebts + pendingHousing)} label="Ações urgentes" valueTone="text-coral"
          subValue={pendingDebts > 0 ? 'Dívidas atrasadas' : 'Habitação pendente'} subLabel="Ver detalhes" subTone="text-gray-500"
          onClick={() => navigate('/transacoes')}
        />
      </motion.div>

      {/* 5. LATEST TRANSACTIONS */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
        <div className="flex items-center justify-between mb-4 mt-2">
          <h2 className="text-lg font-bold dark:text-white">Últimas Transações</h2>
          <button 
            onClick={() => navigate('/transacoes')}
            className="text-xs font-bold text-ocean dark:text-sky uppercase tracking-wide hover:underline"
          >
            Ver Todas
          </button>
        </div>
        <div className="glass-card overflow-hidden">
          {latestTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Sem transações recentes</div>
          ) : (
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {latestTransactions.map(t => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.tipo === 'despesa' ? 'bg-coral/10 text-coral' : 'bg-leaf/10 text-leaf'}`}>
                      {t.tipo === 'despesa' ? <ArrowDownToLine size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div>
                      <div className="font-bold text-sm dark:text-gray-200">{t.desc}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">{t.data}</div>
                    </div>
                  </div>
                  <div className={`font-bold ${t.tipo === 'despesa' ? 'text-gray-900 dark:text-white' : 'text-leaf dark:text-leaf-light'}`}>
                    {t.tipo === 'despesa' ? '-' : '+'}{fmt(t.valor, currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

    </div>
  );
}

/* eslint-disable no-unused-vars */
function QuickActionButton({ icon: Icon, label, color, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center gap-2 shrink-0 snap-center w-[72px] hover-lift active-press group"
    >
      <div className={`w-[60px] h-[60px] rounded-[24px] flex items-center justify-center transition-all duration-300 shadow-md ${color}`}>
        <Icon size={24} />
      </div>
      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-400 tracking-wide text-center">{label}</span>
    </button>
  );
}

/* eslint-disable no-unused-vars */
function DashboardCard({ title, icon: Icon, value, label, valueTone, subValue, subLabel, subTone, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`glass-card p-5 relative overflow-hidden group hover:border-ocean/30 dark:hover:border-sky/30 transition-all hover-lift ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="text-xs uppercase tracking-widest font-bold text-gray-500">{title}</span>
        <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-ocean dark:text-sky">
          <Icon size={14} />
        </div>
      </div>
      <div className="relative z-10">
        <div className={`text-2xl font-black ${valueTone}`}>{value}</div>
        <div className="text-[10px] uppercase font-bold text-gray-400 mt-1">{label}</div>
      </div>
      
      {subValue && (
        <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 flex items-end justify-between relative z-10">
          <div>
            <div className={`text-sm font-bold ${subTone}`}>{subValue}</div>
            <div className="text-[9px] uppercase font-bold text-gray-400">{subLabel}</div>
          </div>
        </div>
      )}
    </div>
  );
}
