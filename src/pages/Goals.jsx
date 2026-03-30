import { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useFinance } from '../hooks/useFinance';
import api from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import { 
  Plus, 
  Trash2, 
  Clock, 
  Target, 
  Home, 
  Car, 
  Plane, 
  Zap, 
  Smartphone, 
  Heart,
  ChevronDown,
  ChevronUp,
  Wallet,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  PiggyBank
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fmt, daysUntil } from '../utils/calculations';
import BinthContextual from '../components/BinthContextual';

// Icon mapping for goals
const GOAL_ICONS = {
  general: Target,
  home: Home,
  car: Car,
  travel: Plane,
  energy: Zap,
  tech: Smartphone,
  emergency: ShieldCheck,
  gift: Heart
};

export default function Goals() {
  const { state, dispatch } = useFinance();
  const currency = state.settings.currency || 'MT';
  const { showToast } = useOutletContext();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [depositForm, setDepositForm] = useState({ amount: '', account_id: '' });
  
  const [form, setForm] = useState({ 
    nome: '', 
    alvo: '', 
    poupado: '', 
    prazo: '', 
    icon: 'general',
    cat: 'Geral' 
  });

  // Calculate global stats
  const stats = useMemo(() => {
    const totalTarget = state.metas?.reduce((acc, m) => acc + Number(m.alvo || 0), 0) || 0;
    const totalSaved = state.metas?.reduce((acc, m) => acc + Number(m.poupado || 0), 0) || 0;
    const globalProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    const activeGoals = state.metas?.filter(m => Number(m.poupado) < Number(m.alvo)).length || 0;
    
    return { totalTarget, totalSaved, globalProgress, activeGoals };
  }, [state.metas]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome || !form.alvo) { 
      showToast('⚠️ Preencha nome e valor alvo'); 
      return; 
    }
    dispatch({
      type: 'ADD_META',
      payload: { 
        ...form, 
        alvo: parseFloat(form.alvo), 
        poupado: parseFloat(form.poupado) || 0 
      },
    });
    setForm({ nome: '', alvo: '', poupado: '', prazo: '', icon: 'general', cat: 'Geral' });
    setIsFormOpen(false);
    showToast('🎯 Meta financeira criada!');
  }

  function handleOpenDeposit(meta) {
    setSelectedGoal(meta);
    setIsDepositModalOpen(true);
    // Set default account if available
    setDepositForm({ amount: '', account_id: state.contas?.[0]?.id || '' });
  }

  async function handleConfirmDeposit(e) {
    e.preventDefault();
    const amount = parseFloat(depositForm.amount);
    if (!amount || amount <= 0) {
      showToast('⚠️ Introduza um valor válido');
      return;
    }
    if (!depositForm.account_id) {
      showToast('⚠️ Selecione uma conta de origem');
      return;
    }

    const account = state.contas.find(c => c.id === Number(depositForm.account_id));
    if (account && account.current_balance < amount) {
      if (!confirm(`O saldo da conta "${account.name}" (${fmt(account.current_balance, currency)}) é inferior ao valor do depósito. Continuar?`)) return;
    }

    try {
      await dispatch({
        type: 'UPDATE_META',
        payload: { 
          id: selectedGoal.id, 
          poupado: selectedGoal.poupado + amount,
          increment: amount,
          account_id: depositForm.account_id
        },
      });
      showToast(`💰 ${fmt(amount, currency)} adicionados à meta!`);
      setIsDepositModalOpen(false);
    } catch {
      showToast('❌ Erro ao atualizar meta');
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      
      {/* ─── 1. OVERVIEW STATS ─── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 border-ocean/10 bg-linear-to-br from-midnight to-dark-light text-white"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-black mb-1">Metas e Objectivos 🎯</h1>
            <p className="text-gray-400 text-sm">Tens {stats.activeGoals} objectivos ativos neste momento.</p>
            
            <div className="mt-6 flex flex-wrap gap-6">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total Acumulado</span>
                <div className="text-2xl font-black text-leaf-light">{fmt(stats.totalSaved, currency)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Objectivo Final</span>
                <div className="text-2xl font-black text-white">{fmt(stats.totalTarget, currency)}</div>
              </div>
              <div className="hidden sm:block">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Progresso Global</span>
                <div className="text-2xl font-black text-sky">{Math.round(stats.globalProgress)}%</div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-48">
             <div className="relative h-24 w-full flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="50%" cy="50%" r="40" className="stroke-white/5 fill-none" strokeWidth="8" />
                  <motion.circle 
                    cx="50%" cy="50%" r="40" 
                    className="stroke-sky fill-none" 
                    strokeWidth="8" 
                    strokeDasharray="251.2"
                    initial={{ strokeDashoffset: 251.2 }}
                    animate={{ strokeDashoffset: 251.2 - (251.2 * stats.globalProgress) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-bold text-white">{Math.round(stats.globalProgress)}%</span>
                  <span className="text-[8px] uppercase font-bold text-gray-400 tracking-tighter">Concluído</span>
                </div>
             </div>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. ADD GOAL (Collapsible) ─── */}
      <div className="glass-card overflow-hidden">
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="w-full p-4 flex items-center justify-between bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky/20 text-sky flex items-center justify-center">
              <Plus size={18} />
            </div>
            <span className="font-bold text-sm">Criar Novo Objectivo</span>
          </div>
          {isFormOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        <AnimatePresence>
          {isFormOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-6 border-t border-black/5 dark:border-white/5"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Nome da Meta</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ex: Fundo de Emergência" 
                      value={form.nome} 
                      onChange={e => setForm({ ...form, nome: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Valor Alvo ({currency})</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="0" 
                      value={form.alvo} 
                      onChange={e => setForm({ ...form, alvo: e.target.value })} 
                      required 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Já Poupado ({currency})</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      placeholder="0" 
                      value={form.poupado} 
                      onChange={e => setForm({ ...form, poupado: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Prazo Final</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={form.prazo} 
                      onChange={e => setForm({ ...form, prazo: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-gray-500 ml-1">Ícone Representativo</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(GOAL_ICONS).map(([key, IconComp]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setForm({ ...form, icon: key })}
                        className={`p-2.5 rounded-xl border-2 transition-all ${
                          form.icon === key 
                            ? 'bg-sky/20 border-sky text-sky' 
                            : 'bg-black/5 border-transparent text-gray-400 dark:text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <IconComp size={20} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setIsFormOpen(false)}
                    className="px-6 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary px-8">
                    Criar Meta
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BinthContextual page="metas" />

      {/* ─── 3. GOALS GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.metas?.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
               className="text-6xl mb-4"
            >
              🚩
            </motion.div>
            <p className="text-gray-400 font-bold">Nenhuma meta definida.</p>
            <p className="text-gray-500 text-xs mt-1">Começa hoje a planear o teu futuro financeiro.</p>
          </div>
        ) : (
          state.metas?.map((m, i) => {
            const pct = Math.min(100, Math.round((Number(m.poupado || 0) / Number(m.alvo || 1)) * 100));
            const days = daysUntil(m.prazo);
            const isComplete = pct >= 100;
            const GoalIcon = GOAL_ICONS[m.icon] || Target;
            
            const themes = [
              'from-sky to-ocean',
              'from-gold to-gold-light',
              'from-leaf-light to-leaf',
              'from-coral to-coral-light',
              'from-midnight to-dark-light'
            ];
            const theme = themes[i % themes.length];

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-linear-to-br ${theme} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <GoalIcon size={24} strokeWidth={2.2} />
                    </div>
                    {days !== null && !isComplete && (
                      <div className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm border ${
                        days < 30 ? 'bg-coral/10 text-coral border-coral/20' : 'bg-leaf/10 text-leaf border-leaf/20'
                      }`}>
                        <Clock size={11} className="inline mr-1" />
                        {days} dias
                      </div>
                    )}
                    {isComplete && (
                      <div className="bg-leaf/10 text-leaf dark:text-leaf-light px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border border-leaf/20">
                        Concluído!
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-base dark:text-white mb-1">{m.nome}</h3>
                  <div className="text-xl font-black text-midnight dark:text-white mb-4">
                    {fmt(m.poupado, currency)}
                    <span className="text-[10px] text-gray-500 font-bold uppercase ml-2 tracking-widest">
                      / {fmt(m.alvo, currency)}
                    </span>
                  </div>

                  <div className="relative h-2 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden mb-5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`absolute h-full bg-linear-to-r ${theme} rounded-full`}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <span>{pct}% Executado</span>
                    <span className="text-ocean dark:text-sky">
                      Faltam {fmt(Number(m.alvo || 0) - Number(m.poupado || 0), currency)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2">
                  {!isComplete && (
                    <button 
                      onClick={() => handleOpenDeposit(m)}
                      className="flex-1 btn btn-primary py-2.5 text-[11px] h-auto shadow-md active:scale-95 transition-all outline-none"
                    >
                      <Plus size={14} className="mr-1" /> Depositar
                    </button>
                  )}
                  {isComplete && (
                     <button className="flex-1 bg-leaf/10 text-leaf font-bold py-2.5 rounded-full text-[11px] flex items-center justify-center gap-1 cursor-default">
                        <CheckCircle2 size={14} /> Meta Concluída
                     </button>
                  )}
                  <button 
                    onClick={() => {
                      setSelectedGoal(m);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-2.5 rounded-full bg-black/5 dark:bg-white/5 text-gray-400 hover:text-coral hover:bg-coral/10 transition-all active:scale-90"
                    title="Apagar meta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── 4. CONFIRM DELETE MODAL ─── */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title="Apagar Meta?"
        message={`Tens a certeza que queres eliminar a meta "${selectedGoal?.nome}"? Todo o progresso poupado será perdido.`}
        confirmText="Sim, Eliminar"
        cancelText="Não, Manter"
        onConfirm={async () => {
          if (selectedGoal) {
            try {
              await api.delete(`/goals/${selectedGoal.id}`);
              dispatch({ type: 'DELETE_META', payload: selectedGoal.id });
              showToast('Meta removida com sucesso', 'success');
            } catch (error) {
              showToast('Erro ao remover meta', 'error');
            } finally {
              setIsDeleteModalOpen(false);
            }
          }
        }}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

      {/* ─── 5. DEPOSIT MODAL (Linked to Accounts) ─── */}
      <AnimatePresence>
        {isDepositModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDepositModalOpen(false)}
              className="absolute inset-0 bg-midnight/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-cream dark:bg-surface rounded-3xl shadow-2xl overflow-hidden border border-white/5"
            >
              <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-leaf to-leaf-light text-white flex items-center justify-center">
                    <PiggyBank size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg dark:text-white">Fazer Depósito</h3>
                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Meta: {selectedGoal?.nome}</p>
                  </div>
                </div>
                <button onClick={() => setIsDepositModalOpen(false)} className="p-2 text-gray-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleConfirmDeposit} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase font-bold text-gray-500 ml-1">Quanto queres poupar?</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 text-lg">{currency}</span>
                    <input 
                      type="number" 
                      autoFocus
                      className="w-full bg-black/5 dark:bg-white/5 border-2 border-transparent focus:border-ocean dark:focus:border-sky rounded-2xl py-4 pl-14 pr-4 text-2xl font-black dark:text-white transition-all outline-none" 
                      placeholder="0.00"
                      value={depositForm.amount}
                      onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] uppercase font-bold text-gray-500 ml-1">De qual conta sai o dinheiro?</label>
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                    {state.contas?.length > 0 ? (
                      state.contas.map(acc => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setDepositForm({ ...depositForm, account_id: acc.id })}
                          className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                            depositForm.account_id === acc.id 
                              ? 'bg-sky/10 border-sky' 
                              : 'bg-black/5 border-transparent hover:border-black/10 dark:hover:border-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                             <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${depositForm.account_id === acc.id ? 'bg-sky text-white' : 'bg-gray-300 text-gray-600 dark:bg-white/10 dark:text-gray-400'}`}>
                                <Wallet size={18} />
                             </div>
                             <div className="text-left">
                                <div className="text-sm font-bold dark:text-white leading-tight">{acc.name}</div>
                                <div className="text-[10px] text-gray-500">Saldo: {fmt(acc.current_balance, currency)}</div>
                             </div>
                          </div>
                          {depositForm.account_id === acc.id && (
                            <div className="w-5 h-5 rounded-full bg-sky text-white flex items-center justify-center">
                              <CheckCircle2 size={12} />
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="p-4 rounded-2xl bg-coral/10 text-coral text-xs font-bold leading-relaxed flex items-start gap-2">
                        <AlertCircle size={16} />
                        Não tens contas registadas. Adiciona uma conta em "Património" para vincular poupanças.
                      </div>
                    )}
                  </div>
                </div>

                <button 
                   type="submit" 
                   disabled={!depositForm.account_id}
                   className="w-full btn btn-primary py-4 text-sm font-black shadow-xl shadow-sky/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  Confirmar Poupança
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
