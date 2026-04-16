import { useEffect, useState } from 'react';
import { X, Plus, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import api from '../utils/api';

const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Saúde',
  'Lazer',
  'Poupança',
  'Salário',
  'Outro',
];

const TYPES = [
  { value: 'despesa', label: 'Despesa', icon: ArrowDownLeft },
  { value: 'receita', label: 'Receita', icon: ArrowUpRight },
];

function resolveInitialType(actionId) {
  if (actionId === 'ADD_INCOME') {
    return 'receita';
  }

  return 'despesa';
}

export default function QuickAddNotificationModal({
  isOpen,
  payload,
  onClose,
  showToast,
}) {
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    tipo: 'despesa',
    desc: '',
    valor: '',
    cat: 'Alimentação',
    nota: '',
    account_id: '',
  });

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const initialType = resolveInitialType(payload?.actionId);
    setForm({
      data: payload?.date || new Date().toISOString().slice(0, 10),
      tipo: initialType,
      desc: '',
      valor: '',
      cat: initialType === 'receita' ? 'Salário' : 'Alimentação',
      nota: '',
      account_id: '',
    });
  }, [isOpen, payload]);

  async function registerInteraction(interaction, actionId) {
    if (!payload?.notificationId) {
      return;
    }

    try {
      await api.post('/notifications/interactions', {
        notificationId: payload.notificationId,
        interaction,
        actionId,
      });
    } catch {
      // Silent on purpose: interaction analytics should not block quick entry.
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.desc || !form.valor) {
      showToast(t('quick_add.toast_fill'));
      return;
    }

    setIsSubmitting(true);
    try {
      await dispatch({
        type: 'ADD_TRANSACTION',
        payload: {
          ...form,
          valor: Number(form.valor),
          account_id: form.account_id || null,
        },
      });

      await registerInteraction('actioned', form.tipo === 'receita' ? 'ADD_INCOME' : 'ADD_EXPENSE');
      showToast(t('quick_add.toast_success'));
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-120 flex items-start justify-center overflow-y-auto px-4 py-8 sm:items-center sm:py-0">
      <div className="fixed inset-0 bg-[#03141d]/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-[2.5rem] border border-white/10 bg-white shadow-[0_30px_100px_rgba(3,20,29,0.3)]">
        <div className="relative overflow-hidden rounded-t-[2.5rem] bg-linear-to-br from-ocean to-[#088395] px-6 pb-6 pt-12 sm:py-8 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_42%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em]">
                <Wallet size={12} /> {t('quick_add.title')}
              </div>
              <h2 className="text-2xl font-black tracking-tight">{t('quick_add.header')}</h2>
              <p className="mt-2 max-w-xl text-sm text-white/80">
                {t('quick_add.desc')}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-[-12px] mr-[-8px] rounded-2xl bg-white/10 p-3 text-white transition hover:bg-white/20 sm:mt-0 sm:mr-0"
              aria-label={t('layout.logout').includes('Terminar') ? 'Fechar' : 'Close'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {TYPES.map((item) => {
              const Icon = item.icon;
              const active = form.tipo === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setForm({
                    ...form,
                    tipo: item.value,
                    cat: item.value === 'receita' ? 'Salário' : form.cat,
                  })}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                    active
                      ? 'border-ocean bg-ocean text-white shadow-lg'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className={`rounded-2xl p-3 ${active ? 'bg-white/15' : 'bg-white'}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.2em]">
                      {item.value === 'receita' ? t('quick_add.fields.income') || 'Receita' : t('quick_add.fields.expense') || 'Despesa'}
                    </div>
                    <div className={`text-xs ${active ? 'text-white/75' : 'text-slate-500'}`}>
                      {item.value === 'receita' ? t('quick_add.entry_fast') : t('quick_add.exit_fast')}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                {t('quick_add.fields.date')}
              </label>
              <input
                type="date"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 outline-none transition focus:border-ocean"
                value={form.data}
                onChange={(event) => setForm({ ...form, data: event.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                {t('quick_add.fields.value')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 outline-none transition focus:border-ocean"
                placeholder="0.00"
                value={form.valor}
                onChange={(event) => setForm({ ...form, valor: event.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                {t('quick_add.fields.description')}
              </label>
              <input
                type="text"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 outline-none transition focus:border-ocean"
                placeholder={form.tipo === 'receita' ? t('quick_add.fields.desc_placeholder_inc') : t('quick_add.fields.desc_placeholder_exp')}
                value={form.desc}
                onChange={(event) => setForm({ ...form, desc: event.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                {t('quick_add.fields.category')}
              </label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 outline-none transition focus:border-ocean"
                value={form.cat}
                onChange={(event) => setForm({ ...form, cat: event.target.value })}
              >
                {CATEGORIES.map((category) => (
                  <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={category} value={category}>
                    {t(`common.categories.${category}`) || category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                {t('quick_add.fields.account')}
              </label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 outline-none transition focus:border-ocean"
                value={form.account_id}
                onChange={(event) => setForm({ ...form, account_id: event.target.value })}
              >
                <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" value="">{t('quick_add.fields.no_account')}</option>
                {(state.contas || []).map((account) => (
                  <option className="text-slate-900 bg-white dark:bg-slate-800 dark:text-white" key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                {t('quick_add.fields.note')}
              </label>
              <input
                type="text"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-800 outline-none transition focus:border-ocean"
                placeholder={t('quick_add.fields.note_placeholder')}
                value={form.nota}
                onChange={(event) => setForm({ ...form, nota: event.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {t('quick_add.habit_hint')}
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ocean px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(10,77,104,0.25)] transition hover:bg-[#088395] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} />
              {isSubmitting ? t('quick_add.saving') : t('quick_add.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
