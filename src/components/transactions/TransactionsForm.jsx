import { ui, useUiLanguage } from '../../utils/uiTranslation';
import { Calendar, Filter, Plus, CreditCard, Tag, Save, Sparkles, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TransactionsForm({
  isOpen,
  handleSubmit,
  editingId,
  setIsMagicPasteOpen,
  form,
  setForm,
  onDescChange,
  onCategoryChange,
  catSuggestion,
  t,
  TYPES,
  CATEGORIES,
  currency,
  accounts,
  defaultIncomeAccount,
  defaultExpenseAccount
}) {
  useUiLanguage();
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <form onSubmit={handleSubmit} className="glass-card p-6 flex flex-col gap-6 border-ocean/20 border relative overflow-hidden">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-ocean dark:text-sky">
                {editingId ? ui("Editar Registo") : ui("Novo Registo")}
              </h3>
              <button type="button" onClick={() => setIsMagicPasteOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gold/10 text-gold hover:bg-gold hover:text-midnight transition-all text-[9px] font-bold uppercase tracking-widest border border-gold/20 shadow-sm">
                <Sparkles size={12} /> Magic Paste
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400"><Calendar size={11} className="inline mr-1" /> {t('transactions.date')}</label>
                <input type="date" className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400"><Filter size={11} className="inline mr-1" /> {t('transactions.type')}</label>
                <select className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm" value={form.tipo} onChange={e => {
                  const type = e.target.value;
                  setForm({
                    ...form,
                    tipo: type,
                    account_id: type === 'receita' ? defaultIncomeAccount || '' : defaultExpenseAccount || ''
                  });
                }}>
                  {TYPES.map(type => <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={type.value} value={type.value}>{ui(type.label)}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400"><Plus size={11} className="inline mr-1" /> {t('transactions.description')}</label>
                <input type="text" className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm" placeholder={t('transactions.desc_placeholder')} value={form.desc} onChange={e => (onDescChange ? onDescChange(e.target.value) : setForm({ ...form, desc: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400"><CreditCard size={11} className="inline mr-1" /> {ui("Valor (")}{currency})</label>
                <input type="number" className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl font-bold text-base w-full" placeholder="0" min="0" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400"><Tag size={11} className="inline mr-1" /> {t('transactions.category')}</label>
                <select className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm" value={form.cat} onChange={e => (onCategoryChange ? onCategoryChange(e.target.value) : setForm({ ...form, cat: e.target.value }))}>
                  {CATEGORIES.map(c => <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={c.id} value={c.id}>{t(`common.categories.${c.key}`)}</option>)}
                </select>
                {catSuggestion && catSuggestion.category === form.cat && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1" aria-live="polite">
                    <Sparkles size={11} className="text-gold" />
                    {catSuggestion.source === 'rules' ? ui("Sugerida pela descrição. Podes mudar.") : ui("Sugerida pelo teu histórico. Podes mudar.")}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400"><Wallet size={11} className="inline mr-1" /> {ui("Conta")}</label>
                <select className="form-input h-10 bg-black/5 dark:bg-white/5 border-transparent focus:border-ocean/20 rounded-xl text-sm" value={form.account_id || ''} onChange={e => setForm({ ...form, account_id: e.target.value })}>
                  <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="">{ui("Sem conta")}</option>
                  {accounts.map(a => <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full h-11 flex items-center justify-center gap-2 rounded-xl shadow-xl shadow-ocean/30 text-[11px] font-bold uppercase tracking-widest">
              {editingId ? <Save size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={3} />}
              {editingId ? ui("Guardar Alterações") : ui("Registar Transação")}
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
