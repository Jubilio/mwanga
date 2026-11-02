import { ui, useUiLanguage } from '../utils/uiTranslation';
import { useEffect, useRef, useState } from 'react';
import { X, Plus, Wallet, ArrowDownLeft, ArrowUpRight, Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import api from '../utils/api';
import { MAIN_CATEGORIES } from '../utils/categories';
import { parseVoiceTransaction } from '../utils/voiceParser';
import { isVoiceInputSupported, listenOnce } from '../services/voiceInput';

const CATEGORIES = MAIN_CATEGORIES;

const TYPES = [
  { value: 'despesa', label: ui("Despesa"), icon: ArrowDownLeft },
  { value: 'receita', label: ui("Receita"), icon: ArrowUpRight },
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
  useUiLanguage();
  const { t } = useTranslation();
  const { state, dispatch } = useFinance();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    tipo: 'despesa',
    desc: '',
    valor: '',
    cat: 'food',
    nota: '',
    account_id: '',
  });
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const voiceSupported = isVoiceInputSupported();
  const isVoiceShortcut = payload?.actionId === 'VOICE' && voiceSupported;
  const autoVoiceFor = useRef(null);
  const listenAbort = useRef(null);

  // Stable while the sheet stays open, so parent re-renders don't wipe what the user typed or said.
  const payloadKey = isOpen
    ? [payload?.actionId, payload?.date, payload?.notificationId, payload?.nonce].join('|')
    : null;

  useEffect(() => {
    if (!isOpen) {
      listenAbort.current?.abort();
      autoVoiceFor.current = null;
      return;
    }
    setHeard('');

    const initialType = resolveInitialType(payload?.actionId);
    setForm({
      data: payload?.date || new Date().toISOString().slice(0, 10),
      tipo: initialType,
      desc: '',
      valor: '',
      cat: initialType === 'receita' ? 'salary' : 'food',
      nota: '',
      account_id: initialType === 'receita' ? state.settings.default_income_account_id || '' : state.settings.default_expense_account_id || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadKey]);

  // Settings often arrive after the sheet opens: fill the default account then, without wiping the form.
  const defaultIncomeAccount = state.settings.default_income_account_id || '';
  const defaultExpenseAccount = state.settings.default_expense_account_id || '';
  useEffect(() => {
    if (!isOpen) return;
    setForm((current) => (current.account_id ? current : {
      ...current,
      account_id: current.tipo === 'receita' ? defaultIncomeAccount : defaultExpenseAccount,
    }));
  }, [isOpen, defaultIncomeAccount, defaultExpenseAccount]);

  async function startVoice() {
    if (listening) {
      listenAbort.current?.abort();
      return;
    }
    const controller = new AbortController();
    listenAbort.current = controller;
    setListening(true);
    try {
      const { text } = await listenOnce({ prompt: t('quick_add.voice.prompt'), signal: controller.signal });
      const parsed = parseVoiceTransaction(text, { accounts: state.contas || [] });
      setHeard(text);
      setForm((current) => {
        const typeChanged = parsed.tipo !== current.tipo;
        const defaultAccount = parsed.tipo === 'receita'
          ? state.settings.default_income_account_id || ''
          : state.settings.default_expense_account_id || '';
        return {
          ...current,
          tipo: parsed.tipo,
          valor: parsed.valor != null ? String(parsed.valor) : current.valor,
          desc: parsed.desc,
          cat: parsed.cat,
          data: parsed.data,
          account_id: parsed.account_id ?? (typeChanged ? defaultAccount : current.account_id),
        };
      });
      showToast(parsed.valor != null ? t('quick_add.voice.check') : t('quick_add.voice.no_amount'), parsed.valor != null ? 'success' : 'warning');
    } catch (error) {
      if (error?.code === 'denied') showToast(t('quick_add.voice.denied'), 'warning');
      else if (error?.code === 'unavailable') showToast(t('quick_add.voice.unavailable'), 'warning');
      else if (error?.code === 'no-speech' || error?.code === 'failed') showToast(t('quick_add.voice.no_speech'), 'warning');
    } finally {
      if (listenAbort.current === controller) listenAbort.current = null;
      setListening(false);
    }
  }

  // Opened from the "Registar por voz" shortcut: start listening straight away.
  useEffect(() => {
    if (!isOpen || payload?.actionId !== 'VOICE' || !voiceSupported || autoVoiceFor.current === payloadKey) return;
    const timer = setTimeout(() => {
      autoVoiceFor.current = payloadKey;
      startVoice();
    }, 350);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, payloadKey, voiceSupported]);

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
    <div className="fixed inset-0 z-120 flex items-start justify-center overflow-y-auto px-4 pt-[calc(2rem+var(--sat))] pb-[calc(2rem+var(--sab))] sm:items-center sm:py-0">
      <div className="fixed inset-0 bg-[#03141d]/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-[2.5rem] border border-white/10 bg-white shadow-[0_30px_100px_rgba(3,20,29,0.3)]">
        <div className="relative overflow-hidden rounded-t-[2.5rem] bg-linear-to-br from-ocean to-[#088395] px-6 pb-6 pt-16 sm:py-8 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_42%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em]">
                <Wallet size={12} /> {t('quick_add.title')}
              </div>
              <h2 className="text-2xl font-black tracking-tight">{isVoiceShortcut ? t('quick_add.voice.header') : t('quick_add.header')}</h2>
              <p className="mt-2 max-w-xl text-sm text-white/80">
                {isVoiceShortcut ? t('quick_add.voice.desc') : t('quick_add.desc')}
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
          {voiceSupported && (
            <div className="rounded-3xl border border-ocean/15 bg-ocean/5 p-4">
              <button
                type="button"
                onClick={startVoice}
                aria-pressed={listening}
                className={`flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left transition ${
                  listening ? 'bg-coral text-white shadow-lg' : 'bg-ocean text-white shadow-[0_12px_30px_rgba(10,77,104,0.25)] hover:bg-[#088395]'
                }`}
              >
                <span className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 ${listening ? 'animate-pulse' : ''}`}>
                  <Mic size={22} />
                </span>
                <span>
                  <span className="block text-sm font-black uppercase tracking-[0.18em]">
                    {listening ? t('quick_add.voice.listening') : t('quick_add.voice.button')}
                  </span>
                  <span className="block text-xs text-white/80">
                    {listening ? t('quick_add.voice.tap_to_stop') : t('quick_add.voice.example')}
                  </span>
                </span>
              </button>
              {heard && (
                <p className="mt-3 text-sm text-slate-600" aria-live="polite">
                  <span className="font-bold text-slate-800">{t('quick_add.voice.heard')}</span> «{heard}». {t('quick_add.voice.review')}
                </p>
              )}
            </div>
          )}

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
                    cat: item.value === 'receita' ? 'salary' : form.cat,
                    account_id: item.value === 'receita' ? state.settings.default_income_account_id || '' : state.settings.default_expense_account_id || '',
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
                      {item.value === 'receita' ? t('dashboard.quick_actions.income') : t('dashboard.quick_actions.expense')}
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
