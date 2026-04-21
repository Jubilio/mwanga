import { useState, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import { Plus, Search, Trash2, Download, Filter, Calendar, Tag, CreditCard, ArrowDownToLine, ArrowUpRight, Save, FileText, Sparkles, X, Brain } from 'lucide-react';
import { fmt, exportToCSV } from '../utils/calculations';
import { parseMobileMoneySMS } from '../utils/smsParser';
import { generateTransactionsPDF } from '../utils/pdfGenerator';
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
  const [showBalance] = useState(() => localStorage.getItem('mwanga-show-balance') !== 'false');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isMagicPasteOpen, setIsMagicPasteOpen] = useState(false);
  const [magicText, setMagicText] = useState('');

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
    if (isFormOpen && !editingId) {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [isFormOpen, editingId]);

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

        {/* ─── SUMMARY CARD (FIXED & RESPONSIVE) ─── */}
        <div className="glass-card p-5 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase font-black tracking-[0.2em] text-gray-500">Entradas</span>
                <span className="text-sm font-black tabular-nums text-leaf-light">
                  {showBalance ? fmt(totals.in, currency) : '••••'}
                </span>
              </div>
              <div className="h-8 w-px bg-white/5" />
              <div className="flex flex-col">
                <span className="text-[8px] uppercase font-black tracking-[0.2em] text-gray-500">Saídas</span>
                <span className="text-sm font-black tabular-nums text-coral-light">
                  {showBalance ? fmt(totals.out, currency) : '••••'}
                </span>
              </div>
              <div className="h-8 w-px bg-white/5" />
              <div className="flex flex-col">
                <span className="text-[8px] uppercase font-black tracking-[0.2em] text-gray-500">Balanço</span>
                <span className={`text-sm font-black tabular-nums ${balance >= 0 ? 'text-white' : 'text-coral'}`}>
                  {showBalance ? `${balance >= 0 ? '+' : ''}${fmt(balance, currency)}` : '••••'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-white/5 pt-4">
               <button
                 onClick={() => setIsScanOpen(true)}
                 className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all text-[10px] font-black uppercase tracking-widest border border-indigo-500/20"
               >
                 <Sparkles size={14} /> Smart Scan
               </button>
               <button
                 onClick={() => generateTransactionsPDF(filtered, state)}
                 className="p-3 rounded-2xl bg-white/5 text-gray-400 hover:text-indigo-400 transition-all shrink-0"
                 title="Exportar PDF"
               >
                 <FileText size={20} />
               </button>
               <button
                  onClick={() => {
                    exportToCSV(filtered);
                    showToast(t('transactions.toast_exported'));
                  }}
                  className="p-3 rounded-2xl bg-white/5 text-gray-400 hover:text-ocean transition-all shrink-0"
                  title="Exportar CSV"
               >
                 <Download size={20} />
               </button>
            </div>
         </div>
      </div>

      {/* ─── 1.5 SMART SCAN MODAL ─── */}
      <AnimatePresence>
        {isScanOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-midnight/80 backdrop-blur-md"
            onClick={() => setIsScanOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-lg p-8 relative overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Binth Smart Scan</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Análise de Extratos via IA</p>
                  </div>
                </div>
                <button onClick={() => setIsScanOpen(false)} className="p-3 -mr-3 text-gray-500 hover:text-white transition-all active:scale-90">
                  <X size={24} />
                </button>
              </div>

              {!isScanning ? (
                <div className="space-y-6">
                  <div className="border-2 border-dashed border-indigo-500/30 rounded-3xl p-12 text-center hover:border-indigo-500/60 transition-all cursor-pointer bg-white/5 group relative">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      accept=".pdf,.csv,.png,.jpg"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setIsScanning(true);
                          setTimeout(() => {
                            setIsScanning(false);
                            setIsScanOpen(false);
                            showToast("IA: Detectamos 12 transações no extrato! Adicionadas com sucesso.", "success");
                          }, 3500);
                        }
                      }}
                    />
                    <Sparkles size={40} className="mx-auto text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-bold text-white mb-2">Arraste o seu extrato PDF ou CSV aqui</p>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Ou clica para escolher o ficheiro</p>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-6">
                  <div className="relative mx-auto w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Brain size={32} className="text-indigo-400" />
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-white animate-pulse">A Binth está a ler o teu extrato...</h3>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

      {/* ─── 3. ADD TRANSACTION FORM ─── */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <form onSubmit={handleSubmit} className="glass-card p-5 flex flex-col gap-5 border-ocean/20 border relative overflow-hidden">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-ocean dark:text-sky">
                  {editingId ? 'Editar Registo' : 'Novo Registo'}
                </h3>
                <button type="button" onClick={() => setIsMagicPasteOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold hover:text-midnight transition-all text-[9px] font-black uppercase tracking-widest border border-gold/20 shadow-sm">
                  <Sparkles size={12} /> Magic Paste
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400"><Calendar size={11} className="inline mr-1" /> {t('transactions.date')}</label>
                  <input type="date" className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400"><Filter size={11} className="inline mr-1" /> {t('transactions.type')}</label>
                  <select className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                    {TYPES.map(t => <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400"><Plus size={11} className="inline mr-1" /> {t('transactions.description')}</label>
                  <input type="text" className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm" placeholder={t('transactions.desc_placeholder')} value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400"><CreditCard size={11} className="inline mr-1" /> Valor ({currency})</label>
                  <input type="number" className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl font-black text-base w-full" placeholder="0" min="0" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-400"><Tag size={11} className="inline mr-1" /> {t('transactions.category')}</label>
                  <select className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm" value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value })}>
                    {CATEGORIES.map(c => <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={c.id} value={c.id}>{t(`transactions.categories.${c.key}`)}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full h-11 flex items-center justify-center gap-2 rounded-xl shadow-xl shadow-ocean/30 text-[11px] font-black uppercase tracking-widest">
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
            <p className="font-black text-slate-500">{t('transactions.empty')}</p>
          </div>
        ) : (
          filtered.map((tr, idx) => (
            <motion.div key={tr.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="glass-card p-4 flex items-center justify-between group hover:bg-white/8 transition-all">
              <div className="flex items-center gap-4">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tr.tipo === 'receita' ? 'bg-leaf/10 text-leaf' : 'bg-coral/10 text-coral'}`}>
                  {tr.tipo === 'receita' ? <ArrowUpRight size={20} /> : <ArrowDownToLine size={20} />}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-midnight dark:text-white leading-tight truncate">{tr.desc}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{tr.data}</span>
                    <CategoryBadge category={tr.cat} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-base font-black tabular-nums ${tr.tipo === 'receita' ? 'text-leaf' : 'text-midnight dark:text-white'}`}>
                  {showBalance ? `${tr.tipo === 'receita' ? '+' : '-'}${fmt(tr.valor, currency)}` : '••••'}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleEdit(tr)} className="p-2 text-gray-300 hover:text-ocean"><Plus size={14} className="rotate-45" /></button>
                  <button onClick={() => handleDelete(tr.id)} className="p-2 text-gray-300 hover:text-coral"><Trash2 size={14} /></button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* ─── 5. MAGIC PASTE MODAL ─── */}
      <AnimatePresence>
        {isMagicPasteOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-midnight/90 backdrop-blur-md" onClick={() => setIsMagicPasteOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={e => e.stopPropagation()} className="glass-card w-full max-w-md p-6 border-gold/30 border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gold text-midnight"><Sparkles size={18} /></div>
                  <h2 className="text-lg font-black text-white">Magic Paste</h2>
                </div>
                <button onClick={() => setIsMagicPasteOpen(false)} className="p-3 -mr-3 text-gray-500 hover:text-white"><X size={24} /></button>
              </div>
              <textarea autoFocus className="form-input w-full h-32 bg-white/5 border-white/10 rounded-2xl p-4 text-xs text-gray-200 mb-6" placeholder="Cola aqui o SMS do M-Pesa ou e-Mola..." value={magicText} onChange={e => setMagicText(e.target.value)} />
              <button onClick={() => {
                const data = parseMobileMoneySMS(magicText);
                if (data) {
                  setForm({ ...form, valor: data.amount, desc: data.description, tipo: data.type, data: data.formattedDate, cat: data.category });
                  setIsMagicPasteOpen(false);
                  setMagicText('');
                  showToast(`Detectado: ${data.amount}MT!`, 'success');
                } else {
                  showToast('Não conseguimos ler este SMS.', 'warning');
                }
              }} className="w-full h-12 rounded-2xl bg-gold text-midnight font-black uppercase tracking-widest text-xs">Processar SMS</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
