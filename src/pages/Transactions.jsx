import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import { Plus, Search, Trash2, Download } from 'lucide-react';
import { fmt, exportToCSV } from '../utils/calculations';
import { getPaymentMethodLabel } from '../utils/paymentMethods';

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

  const filtered = state.transacoes
    .filter(t => filterType === 'all' || t.tipo === filterType)
    .filter(t =>
      t.desc.toLowerCase().includes(search.toLowerCase()) ||
      t.cat.toLowerCase().includes(search.toLowerCase())
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
    </div>
  );
}
