import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import { Plus, Search, Trash2, Download } from 'lucide-react';
import { fmt, exportToCSV } from '../utils/calculations';
import { getPaymentMethodLabel } from '../utils/paymentMethods';
import CategoryBadge from '../components/CategoryBadge';

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

  const TYPES = [
    { value: 'receita', label: t('transactions.types.receita') },
    { value: 'despesa', label: t('transactions.types.despesa') },
    { value: 'renda', label: t('transactions.types.renda') },
    { value: 'poupanca', label: t('transactions.types.poupanca') },
  ];

  const getCategoryTranslation = (catName) => {
    const cat = CATEGORIES.find(c => c.id === catName);
    return cat ? t(`transactions.categories.${cat.key}`) : catName;
  };

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    data: today, tipo: 'despesa', desc: '', valor: '', cat: 'Alimentação', nota: '', account_id: ''
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.desc || !form.valor) {
      showToast(t('transactions.toast_fill_desc'));
      return;
    }
    dispatch({
      type: 'ADD_TRANSACTION',
      payload: { ...form, valor: parseFloat(form.valor), account_id: form.account_id || null },
    });
    setForm({ ...form, desc: '', valor: '', nota: '', account_id: '' });
    showToast(t('transactions.toast_added'));
  }

  function handleDelete(id) {
    if (window.confirm(t('common.confirm_delete'))) {
      dispatch({ type: 'DELETE_TRANSACTION', payload: id });
      showToast(t('transactions.toast_removed'));
    }
  }

  const filtered = state.transacoes
    .filter(t => filterType === 'all' || t.tipo === filterType)
    .filter(t =>
      (t.desc || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.cat || '').toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem' }}>
      {/* Add Transaction Form */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="section-title">
          <span>{t('transactions.add_transaction')}</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}>
            <div>
              <label className="form-label">{t('transactions.date')}</label>
              <input
                type="date"
                className="form-input"
                value={form.data}
                onChange={e => setForm({ ...form, data: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">{t('transactions.type')}</label>
              <select
                className="form-input"
                value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
              >
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">{t('transactions.description')}</label>
              <input
                type="text"
                className="form-input"
                placeholder={t('transactions.desc_placeholder')}
                value={form.desc}
                onChange={e => setForm({ ...form, desc: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">{t('transactions.value_mt').replace('{currency}', currency)}</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                min="0"
                value={form.valor}
                onChange={e => setForm({ ...form, valor: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">{t('transactions.category')}</label>
              <select
                className="form-input"
                value={form.cat}
                onChange={e => setForm({ ...form, cat: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{t(`transactions.categories.${c.key}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">{t('transactions.payment_method')}</label>
              <select
                className="form-input"
                value={form.account_id}
                onChange={e => setForm({ ...form, account_id: e.target.value })}
              >
                <option value="">{t('transactions.none')}</option>
                {state.contas?.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} • {getPaymentMethodLabel(acc.type)} ({fmt(acc.current_balance, currency)})</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-2xl shadow-lg transition-all active:scale-95"
          >
            <Plus size={20} strokeWidth={2.5} />
            {t('transactions.add_transaction')}
          </button>
        </form>
      </div>

      {/* ─── 2. SEARCH & FILTERS ─── */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1 group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-ocean transition-colors">
            <Search size={18} />
          </div>
          <input
            type="text"
            className="form-input pl-11 h-12 bg-white/50 backdrop-blur-md border-white/20 focus:bg-white transition-all shadow-sm"
            placeholder={t('transactions.search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className="form-input h-12 bg-white/50 backdrop-blur-md border-white/20 min-w-[140px] shadow-sm"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">{t('transactions.all_types')}</option>
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button
            onClick={() => {
              exportToCSV(filtered);
              showToast(t('transactions.toast_exported'));
            }}
            className="h-12 px-4 rounded-2xl bg-leaf/10 text-leaf border border-leaf/20 hover:bg-leaf/20 transition-all flex items-center gap-2 font-bold shadow-sm"
            title={t('transactions.export_csv')}
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* ─── 3. TRANSACTIONS LIST ─── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="text-xs font-black uppercase tracking-widest text-gray-400">
          {filtered.length} {t('transactions.records')}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-card p-10 text-center text-gray-400">
            <div className="text-3xl mb-2">🔎</div>
            <p className="font-bold">{t('transactions.empty')}</p>
            <p className="text-[10px] mt-1">{t('transactions.empty_sub')}</p>
          </div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="glass-card p-4 group hover:border-ocean/30 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    t.tipo === 'despesa' || t.tipo === 'renda'
                      ? 'bg-coral/10 text-coral' 
                      : 'bg-leaf/10 text-leaf'
                  }`}>
                    <Plus size={18} className={t.tipo === 'receita' ? 'rotate-0' : 'rotate-45'} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm dark:text-gray-200 truncate">{t.desc}</div>
                    <div className="text-[10px] text-gray-400 font-bold mt-1 truncate flex items-center gap-2">
                      <CategoryBadge category={t.cat} />
                      <span className="opacity-60 uppercase tracking-widest">{t.data}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`font-black tabular-nums ${
                    t.tipo === 'despesa' || t.tipo === 'renda' ? 'text-midnight dark:text-white' : 'text-leaf'
                  }`}>
                    {(t.tipo === 'despesa' || t.tipo === 'renda') ? '-' : '+'}{fmt(t.valor, currency)}
                  </div>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-2 text-gray-300 hover:text-coral transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {t.nota && (
                <div className="mt-2 text-[10px] text-gray-400 italic bg-black/5 dark:bg-white/5 p-2 rounded-lg">
                  "{t.nota}"
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
