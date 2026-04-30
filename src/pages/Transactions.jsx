import { useState, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import { Search } from 'lucide-react';
import { fmt, exportToCSV } from '../utils/calculations';
import { motion } from 'framer-motion';
import { MAIN_CATEGORIES } from '../utils/categories';

// Sub-components
import TransactionsHeader from '../components/transactions/TransactionsHeader';
import SmartScanModal from '../components/transactions/SmartScanModal';
import TransactionsForm from '../components/transactions/TransactionsForm';
import TransactionsList from '../components/transactions/TransactionsList';
import MagicPasteModal from '../components/transactions/MagicPasteModal';
import ConfirmModal from '../components/ConfirmModal';

const CATEGORIES = MAIN_CATEGORIES.map(key => ({ id: key, key }));

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
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });

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
    cat: 'food', 
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
          cat: type === 'receita' ? 'salary' : 'food',
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
    setDeleteConfirm({ isOpen: true, id });
  }

  function confirmDelete() {
    if (deleteConfirm.id) {
      dispatch({ type: 'DELETE_TRANSACTION', payload: deleteConfirm.id });
      showToast(t('transactions.toast_removed'));
    }
    setDeleteConfirm({ isOpen: false, id: null });
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
      
      <TransactionsHeader 
        t={t}
        filteredCount={filtered.length}
        isFormOpen={isFormOpen}
        setIsFormOpen={setIsFormOpen}
        editingId={editingId}
        setEditingId={setEditingId}
        setForm={setForm}
        form={form}
        showBalance={showBalance}
        totals={totals}
        currency={currency}
        balance={balance}
        setIsScanOpen={setIsScanOpen}
        exportToCSV={() => exportToCSV(filtered)}
        showToast={showToast}
        state={state}
        filtered={filtered}
      />

      <SmartScanModal 
        isOpen={isScanOpen}
        setIsOpen={setIsScanOpen}
        isScanning={isScanning}
        setIsScanning={setIsScanning}
        showToast={showToast}
      />

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

      <TransactionsForm 
        isOpen={isFormOpen}
        handleSubmit={handleSubmit}
        editingId={editingId}
        setIsMagicPasteOpen={setIsMagicPasteOpen}
        form={form}
        setForm={setForm}
        t={t}
        TYPES={TYPES}
        CATEGORIES={CATEGORIES}
        currency={currency}
        accounts={state.contas || []}
        defaultIncomeAccount={state.settings.default_income_account_id}
        defaultExpenseAccount={state.settings.default_expense_account_id}
      />

      <TransactionsList 
        filtered={filtered}
        showBalance={showBalance}
        currency={currency}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        t={t}
      />

      <MagicPasteModal 
        isOpen={isMagicPasteOpen}
        setIsOpen={setIsMagicPasteOpen}
        magicText={magicText}
        setMagicText={setMagicText}
        form={form}
        setForm={setForm}
        showToast={showToast}
      />

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title={t('common.confirm_delete')}
        message="Esta acção não pode ser revertida."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
        confirmText={t('debts.yes') || 'Sim'}
        cancelText={t('debts.no') || 'Não'}
      />
    </div>
  );
}
