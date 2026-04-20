import { useState, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import { Plus, Search, Trash2, Download, Filter, Calendar, Tag, CreditCard, ArrowDownToLine, ArrowUpRight, Save } from 'lucide-react';
import { fmt, exportToCSV } from '../utils/calculations';
import { getPaymentMethodLabel } from '../utils/paymentMethods';
import CategoryBadge from '../components/CategoryBadge';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  { id: 'Salário', key: 'salary' },
  { id: 'Renda Casa', key: 'house_rent' },
  { id: 'Alimentação', key: 'food' },
  { id: 'Transporte', key: 'transport' },
  { id: 'Saúde', key: 'health' },
  { id: 'Educação', key: 'education' },
  { id: 'Energia/Água', key: 'energy_water' },
  { id: 'Internet', key: 'internet' },
  { id: 'Igreja/Doações', key: 'church_donations' },
  { id: 'Lazer', key: 'leisure' },
  { id: 'Investimentos', key: 'investments' },
  { id: 'Poupança', key: 'savings' },
  { id: 'Outro', key: 'other' },
];

export default function Transactions() {
  const { state, dispatch } = useFinance();
  const { t } = useTranslation();
  const currency = state.settings.currency || 'MT';
  const { showToast } = useOutletContext();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const TYPES = [
    { value: 'receita', label: t('transactions.types.receita') },
    { value: 'despesa', label: t('transactions.types.despesa') },
    { value: 'renda', label: t('transactions.types.renda') },
    { value: 'poupanca', label: t('transactions.types.poupanca') },
  ];

  const today = new Date().toISOString().split('T')[0];
  const location = useLocation();
  const [form, setForm] = useState({
    data: today, 
    tipo: 'despesa', 
    desc: '', 
    valor: '', 
    cat: 'Alimentação', 
    nota: '', 
    account_id: state.settings.default_expense_account_id || ''
  });

  useEffect(() => {
    if (location.state?.openModal) {
      setIsFormOpen(true);
      if (location.state.tipo) {
        const type = location.state.tipo;
        const defaultAcc = type === 'receita' 
          ? state.settings.default_income_account_id 
          : state.settings.default_expense_account_id;
          
        setForm(f => ({ 
          ...f, 
          tipo: type,
          cat: type === 'receita' ? 'Salário' : 'Alimentação',
          account_id: defaultAcc || ''
        }));
      }
    }
  }, [location.state, state.settings]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.desc || !form.valor) {
      showToast(t('transactions.toast_fill_desc'));
      return;
    }
    if (editingId) {
      dispatch({
        type: 'UPDATE_TRANSACTION',
        payload: { ...form, id: editingId, valor: parseFloat(form.valor), account_id: form.account_id || null },
      });
      setEditingId(null);
      showToast(t('transactions.toast_updated') || 'Transação actualizada');
    } else {
      dispatch({
        type: 'ADD_TRANSACTION',
        payload: { ...form, valor: parseFloat(form.valor), account_id: form.account_id || null },
      });
      showToast(t('transactions.toast_added'));
    }
    setForm({ ...form, desc: '', valor: '', nota: '', account_id: '' });
    setIsFormOpen(false);
  }

  function handleEdit(tr) {
    setEditingId(tr.id);
    setForm({
      data: tr.data,
      tipo: tr.tipo,
      desc: tr.desc,
      valor: tr.valor,
      cat: tr.cat,
      nota: tr.nota || '',
      account_id: tr.account_id || ''
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(id) {
    if (window.confirm(t('common.confirm_delete'))) {
      dispatch({ type: 'DELETE_TRANSACTION', payload: id });
      showToast(t('transactions.toast_removed'));
    }
  }

  const filtered = (state.transacoes || [])
    .filter(t => filterType === 'all' || t.tipo === filterType)
    .filter(tr =>
      (tr.desc || '').toLowerCase().includes(search.toLowerCase()) ||
      (tr.cat || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.data) - new Date(a.data));

  const totals = filtered.reduce((acc, curr) => {
    const val = Number(curr.valor || 0);
    if (curr.tipo === 'receita') acc.in += val;
    else if (curr.tipo === 'despesa' || curr.tipo === 'renda') acc.out += val;
    else if (curr.tipo === 'poupanca') acc.sav += val;
    return acc;
  }, { in: 0, out: 0, sav: 0 });

  const balance = totals.in - totals.out;

  return (
    <div className="flex flex-col gap-6" style={{ paddingBottom: '7rem' }}>
      
      {/* ─── 1. HEADER & SUMMARY ─── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h1 className="text-2xl font-black dark:text-white leading-tight">Transações</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
              {filtered.length} {t('transactions.records')}
            </p>
          </div>
          <button
            onClick={() => {
              if (isFormOpen && editingId) {
                setEditingId(null);
                setForm({ ...form, desc: '', valor: '', nota: '', account_id: '' });
              }
              setIsFormOpen(!isFormOpen);
            }}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg transition-all active:scale-95 ${
              isFormOpen ? 'bg-coral text-white' : 'bg-linear-to-br from-ocean to-sky text-white'
            }`}
          >
            <Plus size={24} className={`transition-transform duration-300 ${isFormOpen ? 'rotate-45' : ''}`} />
          </button>
        </div>

        {/* Improved Summary Card */}
        <div className="glass-card p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase font-black tracking-widest text-gray-400">Entradas</span>
                <span className="text-sm font-black tabular-nums text-leaf-light">{fmt(totals.in, currency)}</span>
              </div>
              <div className="flex flex-col border-l border-white/10 pl-4">
                <span className="text-[8px] uppercase font-black tracking-widest text-gray-400">Saídas</span>
                <span className="text-sm font-black tabular-nums text-coral-light">{fmt(totals.out, currency)}</span>
              </div>
              <div className="flex flex-col border-l border-white/10 pl-4">
                <span className="text-[8px] uppercase font-black tracking-widest text-gray-400">Balanço</span>
                <span className={`text-sm font-black tabular-nums ${balance >= 0 ? 'text-leaf-light' : 'text-coral-light'}`}>
                  {balance >= 0 ? '+' : ''}{fmt(balance, currency)}
                </span>
              </div>
            </div>
            <button
               onClick={() => {
                 exportToCSV(filtered);
                 showToast(t('transactions.toast_exported'));
               }}
               className="p-2.5 rounded-xl bg-white/5 text-gray-400 hover:text-ocean transition-all shrink-0"
               title="Exportar CSV"
            >
              <Download size={18} />
            </button>
        </div>
      </div>

      {/* ─── 2. SEARCH & FILTERS ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-ocean transition-colors">
            <Search size={18} />
          </div>
          <input
            type="text"
            className="form-input pl-11 h-11 bg-white/40 dark:bg-white/5 backdrop-blur-md border-transparent focus:bg-white dark:focus:bg-white/10 transition-all shadow-sm rounded-xl"
            placeholder={t('transactions.search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="form-input h-11 bg-white/40 dark:bg-white/5 backdrop-blur-md border-transparent min-w-[130px] shadow-sm rounded-xl appearance-none text-xs font-bold pl-4 pr-10"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="all">{t('transactions.all_types')}</option>
            {TYPES.map(t => <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* ─── 3. ADD TRANSACTION FORM (Collapsible) ─── */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="glass-card p-5 flex flex-col gap-5 border-ocean/20 border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                    <Calendar size={11} /> {t('transactions.date')}
                  </label>
                  <input
                    type="date"
                    className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm"
                    value={form.data}
                    onChange={e => setForm({ ...form, data: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                    <Filter size={11} /> {t('transactions.type')}
                  </label>
                  <select
                    className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm"
                    value={form.tipo}
                    onChange={e => {
                      const newType = e.target.value;
                      const defaultAcc = newType === 'receita' 
                        ? state.settings.default_income_account_id 
                        : state.settings.default_expense_account_id;
                      setForm({ 
                        ...form, 
                        tipo: newType, 
                        cat: newType === 'receita' ? 'Salário' : 'Alimentação',
                        account_id: defaultAcc || form.account_id
                      });
                    }}
                  >
                    {TYPES.map(t => <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 lg:col-span-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                    <Plus size={11} /> {t('transactions.description')}
                  </label>
                  <input
                    type="text"
                    className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm"
                    placeholder={t('transactions.desc_placeholder')}
                    value={form.desc}
                    onChange={e => setForm({ ...form, desc: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                    <CreditCard size={11} /> {t('transactions.value_mt').replace('{currency}', currency)}
                  </label>
                   <div className="relative">
                    <input
                      type="number"
                      className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl font-black text-base w-full"
                      placeholder="0"
                      min="0"
                      value={form.valor}
                      onChange={e => setForm({ ...form, valor: e.target.value })}
                    />
                    {form.tipo === 'receita' && form.cat === 'Salário' && state.settings.user_salary > 0 && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, valor: state.settings.user_salary })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-leaf/10 text-leaf text-[9px] font-black uppercase hover:bg-leaf/20 transition-colors"
                      >
                        Carregar Salário
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                    <Tag size={11} /> {t('transactions.category')}
                  </label>
                  <select
                    className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm"
                    value={form.cat}
                    onChange={e => setForm({ ...form, cat: e.target.value })}
                  >
                    {CATEGORIES.map(c => (
                      <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={c.id} value={c.id}>
                        {t(`transactions.categories.${c.key}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                    <CreditCard size={11} /> {t('transactions.payment_method')}
                  </label>
                  <select
                    className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm"
                    value={form.account_id}
                    onChange={e => setForm({ ...form, account_id: e.target.value })}
                  >
                    <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="">{t('transactions.none')}</option>
                    {state.contas?.map(acc => (
                      <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={acc.id} value={acc.id}>
                        {acc.name} • ({fmt(acc.current_balance, currency)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="btn-primary w-full h-11 flex items-center justify-center gap-2 rounded-xl shadow-xl shadow-ocean/30 transition-all active:scale-95 text-[11px] font-black uppercase tracking-widest"
              >
                {editingId ? <Save size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
                {editingId ? 'Guardar Alterações' : 'Registar Transação'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 4. TRANSACTIONS LIST ─── */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="glass-card p-16 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-4xl">📝</div>
            <div>
              <p className="font-black text-slate-500">{t('transactions.empty')}</p>
              <p className="text-[10px] font-bold text-gray-400/60 uppercase tracking-widest mt-1">{t('transactions.empty_sub')}</p>
            </div>
            <button onClick={() => setIsFormOpen(true)} className="text-xs font-black text-ocean uppercase tracking-widest hover:underline mt-4">Adicionar Primeira</button>
          </div>
        ) : (
          filtered.map((tr, idx) => (
            <motion.div
              key={tr.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.3 }}
              className="glass-card p-4 flex items-center justify-between group hover:bg-white/40 dark:hover:bg-white/8 transition-all cursor-default"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  tr.tipo === 'receita' ? 'bg-leaf/10 text-leaf' : 'bg-coral/10 text-coral'
                }`}>
                  {tr.tipo === 'receita' ? <ArrowUpRight size={20} /> : <ArrowDownToLine size={20} />}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-midnight dark:text-white leading-tight truncate">{tr.desc}</span>
                  <div className="mt-1 flex items-center gap-2 overflow-hidden">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0">{tr.data}</span>
                    <div className="h-1 w-1 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                    <CategoryBadge category={tr.cat} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 pl-2">
                <span className={`text-base font-black tabular-nums whitespace-nowrap ${
                  tr.tipo === 'receita' ? 'text-leaf' : 'text-midnight dark:text-white'
                }`}>
                  {tr.tipo === 'receita' ? '+' : '-'}{fmt(tr.valor, currency).split(',')[0]}
                  <span className="opacity-30 text-[10px]">,{fmt(tr.valor, currency).split(',')[1]}</span>
                </span>
                <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => handleEdit(tr)}
                    className="p-2 rounded-xl text-gray-300 hover:bg-ocean/10 hover:text-ocean transition-all"
                  >
                    <Plus size={16} className="rotate-45 scale-75" /> {/* Using Edit icon if imported, or lucide-pencil */}
                    <Search size={16} className="hidden" /> {/* placeholder */}
                    <div className="w-4 h-4 flex items-center justify-center">
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </div>
                  </button>
                  <button
                    onClick={() => handleDelete(tr.id)}
                    className="p-2 rounded-xl text-gray-300 hover:bg-coral/10 hover:text-coral transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
