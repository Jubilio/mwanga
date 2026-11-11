import { ui, useUiLanguage, uiLocale } from '../utils/uiTranslation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clipboard, MessageSquare, RefreshCw, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import api from '../utils/api';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';
import { Capacitor } from '@capacitor/core';
import { useSmsSync } from '../hooks/useSmsSync';
import { SMS_INBOX_ENABLED, getEffectiveTier } from '../config/features';
import { useFinance } from '../hooks/useFinance';
import { useCategorySuggester } from '../hooks/useCategorySuggester';
import { getSmsQuota } from '../utils/smsQuota';

const SAMPLE_SMS = [
  'A conta 406659018 foi debitada no valor de 20.00 MZN as 23:17 do dia 24/02/26. Millennium bim',
  'mKesh: Transferiste 1,500.00MT para Fatima Macie (845123456). Taxa: 15.00MT. Saldo: 8,230.50MT. Ref: TXN20260224001',
  'Caro Cliente, registamos uma compra de 1.585,00 MZN a 30/10/2026 19:29 na(o) CAPUCCINO com cartao ***5710. Se nao reconhece, ligue gratis 800224224/(+258)21224224.',
  'BCI: A sua conta 00123456-7 foi creditada com 45,000.00MZN em 24/02/2026 as 09:30. Referencia: SAL-2026-002',
  'Vodacom M-Pesa: Levantaste 2,000MT no agente A12345 (Maputo Centro). Taxa: 20MT. Saldo disponivel: 5,430.00MT',
  'Ola! A tua encomenda chegou. Levanta na loja mais proxima com o codigo 8821.',
];

const TYPE_COLORS = (t) => ({
  debit: { bg: 'bg-coral/10', border: 'border-coral', text: 'text-coral', label: t('sms_import.result.labels.description') },
  credit: { bg: 'bg-aurora/10', border: 'border-aurora', text: 'text-aurora', label: t('sms_import.result.labels.description') },
  transfer_out: { bg: 'bg-gold/10', border: 'border-gold', text: 'text-gold', label: t('sms_import.result.labels.description') },
  transfer_in: { bg: 'bg-sky/10', border: 'border-sky', text: 'text-sky', label: t('sms_import.result.labels.description') },
  withdrawal: { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-400', label: t('sms_import.result.labels.description') },
  // The server parser names cash withdrawals and deposits in Portuguese.
  levantamento: { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-400', label: t('sms_import.result.labels.description') },
  deposito: { bg: 'bg-emerald-500/10', border: 'border-emerald-500', text: 'text-emerald-400', label: t('sms_import.result.labels.description') },
  deposit: { bg: 'bg-emerald-500/10', border: 'border-emerald-500', text: 'text-emerald-400', label: t('sms_import.result.labels.description') },
  payment: { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-400', label: t('sms_import.result.labels.description') },
  fee: { bg: 'bg-coral/10', border: 'border-coral', text: 'text-coral', label: t('sms_import.result.labels.description') },
  unknown: { bg: 'bg-slate-500/10', border: 'border-slate-500', text: 'text-slate-600 dark:text-slate-400', label: t('common.categories.other') },
});

function ConfidenceBar({ score }) {
  useUiLanguage();
  const pct = Math.round((score || 0) * 100);
  const colorClass = pct >= 85 ? 'bg-aurora shadow-[0_0_8px_rgba(46,204,113,0.5)]' : pct >= 60 ? 'bg-gold shadow-[0_0_8px_rgba(201,150,58,0.5)]' : 'bg-coral shadow-[0_0_8px_rgba(224,122,95,0.5)]';
  const textColor = pct >= 85 ? 'text-aurora' : pct >= 60 ? 'text-gold' : 'text-coral';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ease-out ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-mono text-xs min-w-[40px] ${textColor}`}>{pct}%</span>
    </div>
  );
}

function DataRow({ label, value, accentClass }) {
  useUiLanguage();
  if (value === null || value === undefined || value === '') return null;

  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-slate-600 dark:text-slate-400 text-xs font-mono uppercase tracking-wider min-w-[120px]">{ui(label)}</span>
      <span className={`text-sm font-normal text-right max-w-[260px] break-words ${accentClass || 'text-slate-200'}`}>
        {String(value)}
      </span>
    </div>
  );
}

const INCOME_TYPES = ['credit', 'deposit', 'deposito', 'transfer_in'];

function inferTransactionType(result) {
  return INCOME_TYPES.includes(result.transaction_type) ? 'receita' : 'despesa';
}

// Fallback when the household's history has nothing confident to say.
function inferCategory(result) {
  const type = result.transaction_type;
  if (type === 'credit') return 'salary';
  return 'other';
}

// Who received the money says what it was for. The raw SMS text would only add noise.
function categoryText(result) {
  return [result.recipient_name, result.merchant_name].filter(Boolean).join(' ');
}

// Plain words for the transaction description, e.g. "BCI - Compra - CENTRO MED".
const TYPE_WORDS = {
  debit: 'Débito',
  credit: 'Crédito',
  transfer_out: 'Transferência enviada',
  transfer_in: 'Transferência recebida',
  withdrawal: 'Levantamento',
  levantamento: 'Levantamento',
  deposit: 'Depósito',
  deposito: 'Depósito',
  payment: 'Compra',
  fee: 'Taxa',
};

function buildDescription(result) {
  const label = ui(TYPE_WORDS[result.transaction_type] || 'Movimento');
  const extras = [result.recipient_name, result.agent_code ? `${ui('Agente')} ${result.agent_code}` : null].filter(Boolean).join(' • ');
  return [result.bank_name || 'SMS', label, extras].filter(Boolean).join(' - ').slice(0, 255);
}

// Amounts may come back from the AI fallback as text such as "2,580.00".
function toAmount(value) {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace(/[^\d.,]/g, '');
  const decimalComma = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.');
  const normalized = decimalComma ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');
  return Number.parseFloat(normalized);
}

function toIsoDate(datetime) {
  const day = String(datetime || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : new Date().toISOString().slice(0, 10);
}

/** Same rule as the Android inbox sync: an account named after the bank, else the default account. */
function pickAccountId(result, contas = [], settings = {}) {
  const bank = String(result.bank_name || '').toLowerCase();
  const firstWord = bank.split(/[\s-]+/).find((word) => word.length >= 3);
  const match = bank && contas.find((c) => {
    const name = String(c.name || '').toLowerCase();
    return name.includes(bank) || bank.includes(name) || (firstWord && name.includes(firstWord));
  });
  if (match) return Number(match.id);
  const fallback = inferTransactionType(result) === 'receita' ? settings.default_income_account_id : settings.default_expense_account_id;
  return fallback ? Number(fallback) : undefined;
}

function toBalance(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = toAmount(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * An older SMS must not overwrite a newer balance: only suggest syncing when
 * the account has no transaction dated after this message.
 */
export function shouldSyncBalance(result, accountId, transacoes = []) {
  if (!accountId || toBalance(result?.balance_after) === null) return false;
  const smsDate = toIsoDate(result.transaction_datetime);
  return !transacoes.some((tx) => String(tx.account_id) === String(accountId) && String(tx.data || tx.date || '') > smsDate);
}

// ui() only interpolates strings it has a translation for; fill the rest here.
function uiFill(text, params) {
  return String(ui(text, params)).replace(/\{\{(\w+)\}\}/g, (match, key) => (key in params ? params[key] : match));
}

function formatMzn(value, currency = 'MZN') {
  return `${Number(value).toLocaleString(uiLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function saveErrorMessage(error, t) {
  if (!error?.response) return ui('Sem ligação ao servidor. Verifique a internet e tente novamente.');
  const data = error.response.data || {};
  const firstDetail = Array.isArray(data.details) && data.details[0]
    ? `${data.details[0].path?.join('.') || ''} ${data.details[0].message || ''}`.trim()
    : null;
  return [data.error || data.message || t('sms_import.toasts.save_error'), firstDetail].filter(Boolean).join(': ');
}

function buildNote(result, rawText, t) {
  const pieces = [
    `${t('sms_import.result.labels.bank')}: ${result.bank_name || '?' }`,
    result.transaction_id ? `${t('sms_import.result.labels.tx_id')}: ${result.transaction_id}` : null,
    result.account_number ? `${t('sms_import.result.labels.account_ref')}: ${result.account_number}` : null,
    result.balance_after !== null && result.balance_after !== undefined ? `${t('sms_import.result.labels.balance_after')}: ${result.balance_after} ${result.currency || 'MZN'}` : null,
    result.fee_amount ? `${t('sms_import.result.labels.fee')}: ${result.fee_amount} ${result.currency || 'MZN'}` : null,
    `${t('sms_import.result.confidence_label')}: ${Math.round((result.confidence_score || 0) * 100)}%`,
    `SMS: ${rawText}`,
  ].filter(Boolean);

  return pieces.join(' | ').slice(0, 1000);
}

export default function SmsImport() {
  const uiLanguage = useUiLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [smsText, setSmsText] = useState(SAMPLE_SMS[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pasteLoading, setPasteLoading] = useState(false);
  const { t } = useTranslation();
  // The layout draws the toast; a local useToast() here was never rendered, so every
  // message on this page (including save errors) was invisible.
  const outlet = useOutletContext();
  const localToast = useToast();
  const showToast = outlet?.showToast || localToast.showToast;
  const { syncSms } = useSmsSync(showToast);
  const [syncing, setSyncing] = useState(false);
  const { state, reloadData } = useFinance();
  const suggestCategory = useCategorySuggester(state.transacoes);
  const [saveError, setSaveError] = useState('');
  const [accountId, setAccountId] = useState('');
  const [syncBalance, setSyncBalance] = useState(false);
  // Saves from this page are not pushed into the store, so count them here too.
  const [savedHere, setSavedHere] = useState(0);
  const quota = getSmsQuota(getEffectiveTier(state.settings), state.transacoes, new Date(), savedHere);
  const quotaReached = quota.limited && quota.remaining <= 0;
  const canReadInbox = SMS_INBOX_ENABLED && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  async function handleInboxSync() {
    setSyncing(true);
    try {
      await syncSms(true);
    } finally {
      setSyncing(false);
    }
  }
  const textareaRef = useRef(null);

  const typeInfo = useMemo(() => {
    if (!result?.transaction_type) return null;
    const types = TYPE_COLORS(t);
    return types[result.transaction_type] || types.unknown;
  }, [result?.transaction_type, t, uiLanguage]);
  const incomingSharedText = useMemo(
    () => searchParams.get('text') || searchParams.get('sms') || searchParams.get('body') || '',
    [searchParams, uiLanguage],
  );

  const parseText = useCallback(async (textToParse) => {
    const raw = String(textToParse || '').trim();
    if (!raw) return;

    setLoading(true);
    setResult(null);

    try {
      // Timeout after 15s to prevent infinite loading on mobile
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await api.post('/sms/parse', { raw_text: raw }, { signal: controller.signal });
      clearTimeout(timeoutId);

      const parsedData = res.data.data.parsed_data;
      setResult(parsedData);
      setSaveError('');
      const pickedAccount = parsedData ? String(pickAccountId(parsedData, state.contas, state.settings) ?? '') : '';
      setAccountId(pickedAccount);
      setSyncBalance(shouldSyncBalance(parsedData, pickedAccount, state.transacoes));
      showToast(ui("SMS analisado com sucesso!"), 'success');
    } catch (error) {
      console.error(error);
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        showToast(ui("A análise demorou demasiado. Verifique a sua conexão e tente novamente."), 'error');
      } else {
        showToast(error.response?.data?.message || error.response?.data?.error || ui("Erro ao processar o SMS."), 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast, state.contas, state.settings, state.transacoes]);

  useEffect(() => {
    if (!incomingSharedText) return;

    const cleaned = incomingSharedText.trim();
    if (!cleaned) return;

    setSmsText(cleaned);
    setSearchParams({}, { replace: true });
    showToast(t('sms_import.toasts.shared_received'), 'success');
    parseText(cleaned);
  }, [incomingSharedText, parseText, setSearchParams, showToast, t]);

  async function handlePasteFromClipboard() {
    setPasteLoading(true);
    try {
      // Check if Clipboard API is available (requires HTTPS on mobile)
      if (!navigator.clipboard?.readText) {
        // Fallback: focus the textarea so user can paste manually
        textareaRef.current?.focus();
        showToast(t('sms_import.toasts.paste_info'), 'info');
        return;
      }

      // Add timeout for mobile browsers that silently hang
      const clipPromise = navigator.clipboard.readText();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      );

      const clipText = await Promise.race([clipPromise, timeoutPromise]);
      if (!clipText.trim()) {
        showToast(t('sms_import.toasts.paste_empty'), 'error');
        return;
      }
      setSmsText(clipText);
      textareaRef.current?.focus();
      showToast(t('sms_import.toasts.paste_success'), 'success');
    } catch (error) {
      console.error(error);
      // Fallback: focus textarea for manual paste
      textareaRef.current?.focus();
      if (error.message === 'timeout') {
        showToast(t('sms_import.toasts.paste_blocked'), 'error');
      } else {
        showToast(t('sms_import.toasts.paste_manual'), 'error');
      }
    } finally {
      setPasteLoading(false);
    }
  }

  async function saveTransaction() {
    if (!result || result.is_financial === false) return;
    setSaveError('');
    const amount = toAmount(result.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setSaveError(ui('Não encontrámos o valor nesta mensagem.'));
      return;
    }
    if (quotaReached) {
      const message = t('sms_quota.reached', { limit: quota.limit });
      setSaveError(message);
      showToast(message, 'error');
      return;
    }

    setSaving(true);
    try {
      const txType = inferTransactionType(result);
      const suggestion = suggestCategory(categoryText(result), txType);
      const payload = {
        date: toIsoDate(result.transaction_datetime),
        type: txType,
        amount,
        description: buildDescription(result),
        category: suggestion?.category || inferCategory(result),
        note: buildNote(result, smsText, t),
      };
      if (accountId) payload.account_id = Number(accountId);

      await api.post('/transactions', payload);
      setSavedHere((count) => count + 1);

      const smsBalance = toBalance(result.balance_after);
      if (syncBalance && accountId && smsBalance !== null) {
        try {
          // The server records any remaining difference (e.g. the fee) as a balance adjustment.
          await api.put(`/accounts/${accountId}/balance`, { current_balance: smsBalance });
          showToast(uiFill('Transação registada e saldo da conta acertado para {{p0}}.', { p0: formatMzn(smsBalance, result.currency || 'MZN') }), 'success');
        } catch (error) {
          console.error(error);
          showToast(uiFill('Transação registada, mas não foi possível acertar o saldo: {{p0}}', { p0: saveErrorMessage(error, t) }), 'warning');
        }
      } else {
        showToast(t('sms_import.toasts.save_success'), 'success');
      }
      setResult(null);
      setSmsText('');
      // Bring the new transaction and account balances into the rest of the app.
      Promise.resolve(reloadData?.()).catch((error) => console.warn('Reload after SMS save failed:', error));
    } catch (error) {
      console.error(error);
      const message = saveErrorMessage(error, t);
      setSaveError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  const selectedAccount = state.contas?.find((c) => String(c.id) === String(accountId));
  const smsBalanceValue = result ? toBalance(result.balance_after) : null;
  const resultAmount = result ? toAmount(result.amount) : NaN;
  const balancePreview = selectedAccount && smsBalanceValue !== null && Number.isFinite(resultAmount)
    ? (() => {
      const signed = inferTransactionType(result) === 'receita' ? resultAmount : -resultAmount;
      const expected = Number(selectedAccount.current_balance || 0) + signed;
      return { name: selectedAccount.name, smsBalance: smsBalanceValue, expected, difference: smsBalanceValue - expected };
    })()
    : null;

  return (
    <div className="p-4 md:p-6 w-full max-w-none font-mono">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark dark:text-white flex items-center gap-3">
          <Zap className="text-gold" />
          {t('sms_import.title')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          {t('sms_import.description')}
        </p>
        {quota.limited && (
          <div
            className="glass-card mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"
            style={{ padding: '12px 16px', borderColor: quotaReached ? 'rgba(224,122,95,0.4)' : undefined }}
          >
            <span className={quotaReached ? 'text-coral' : 'text-slate-300'}>
              {quotaReached
                ? t('sms_quota.reached', { limit: quota.limit })
                : t('sms_quota.used', { used: quota.used, limit: quota.limit })}
            </span>
            <Link to="/pricing" className="inline-flex min-h-11 items-center font-bold text-(--color-gold-text)">{t('sms_quota.see_plans')}</Link>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6 min-w-0">
          <div className="glass-card overflow-hidden">
            <div className="bg-white/5 border-b border-white/5 p-3 flex items-center gap-2">
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-coral" />
                <div className="w-2.5 h-2.5 rounded-full bg-gold" />
                <div className="w-2.5 h-2.5 rounded-full bg-aurora" />
              </div>
              <span className="ml-2 text-xs text-slate-600 dark:text-slate-400 tracking-widest font-bold flex items-center gap-2">
                <MessageSquare size={14} /> {t('sms_import.input_header')}
              </span>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-2xl border border-sky/20 bg-sky/5 p-4 text-xs text-slate-300 leading-6">
                <div className="flex items-center gap-2 font-bold text-sky mb-2">
                  <Smartphone size={14} /> {t('sms_import.mobile_tip.title')}
                </div>
                <p>
                  {t('sms_import.mobile_tip.desc')}
                </p>
              </div>

              {canReadInbox && (
                <button
                  type="button"
                  onClick={handleInboxSync}
                  disabled={syncing}
                  className="w-full py-3 border border-sky/30 bg-sky/10 hover:bg-sky/20 text-sky font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                  {ui("Sincronizar SMS Agora")}
                </button>
              )}

              <textarea
                ref={textareaRef}
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                placeholder={t('sms_import.placeholder')}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full min-h-[180px] bg-black/20 border border-white/10 rounded-xl text-slate-200 text-sm p-4 resize-y focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all font-mono leading-relaxed"
              />

              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  disabled={pasteLoading}
                  className="py-3 border border-white/10 bg-white/5 hover:bg-white/10 text-slate-200 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {pasteLoading ? <RefreshCw size={18} className="animate-spin" /> : <Clipboard size={18} />}
                  {t('sms_import.btn_paste')}
                </button>

                <button
                  type="button"
                  onClick={() => parseText(smsText)}
                  disabled={loading || !smsText.trim()}
                  className="py-3 bg-linear-to-r from-gold to-gold-deep hover:from-gold-deep hover:to-sand text-midnight font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />}
                  {loading ? t('sms_import.btn_analyzing') : t('sms_import.btn_analyze')}
                </button>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="text-xs text-slate-600 dark:text-slate-400 tracking-widest font-bold mb-4">{t('sms_import.examples_header')}</div>
            <div className="flex flex-col gap-2">
              {SAMPLE_SMS.map((sample, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => setSmsText(sample)}
                  className={`p-3 rounded-lg text-xs text-left transition-all border leading-relaxed ${
                    smsText === sample
                      ? 'bg-gold/10 border-gold/40 text-gold shadow-[0_0_10px_rgba(201,150,58,0.1)]'
                      : 'bg-black/20 border-white/5 text-slate-600 dark:text-slate-400 hover:bg-white/5 hover:text-slate-300'
                  }`}
                >
                  {sample.length > 90 ? `${sample.slice(0, 90)}...` : sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 min-w-0">
          {result ? (
            <div className={`glass-card overflow-hidden border ${typeInfo?.border || 'border-white/10'} transition-all duration-500 animate-fade-in-up`}>
              <div className={`px-6 py-4 border-b ${typeInfo?.bg || 'bg-white/5'} border-white/10 flex items-center justify-between gap-3`}>
                {result.is_financial === false ? (
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <AlertCircle size={16} /> {t('sms_import.result.non_financial')}
                  </span>
                ) : (
                  <>
                    <span className={`text-xs font-bold rounded-md px-3 py-1 tracking-wider ${typeInfo?.text} bg-black/20`}>
                      {typeInfo?.label || 'UNKNOWN'}
                    </span>
                    <span className="text-lg md:text-xl font-bold text-white tracking-tight text-right break-words">
                      {result.amount ? `${Number(result.amount).toLocaleString(uiLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${result.currency || 'MZN'}` : '—'}
                    </span>
                  </>
                )}
              </div>

              {result.is_financial !== false && (
                <div className="p-6">
                  <div className="mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2 gap-3">
                      <span className="text-xs text-slate-600 dark:text-slate-400 tracking-widest font-bold flex items-center gap-2">
                        <ShieldCheck size={14} className="text-aurora" /> {t('sms_import.result.confidence_label')}
                      </span>
                      {result.confidence_score >= 0.8 && (
                        <span className="text-[10px] bg-aurora/20 text-aurora px-2 py-1 rounded-full">{t('sms_import.result.confidence_high')}</span>
                      )}
                    </div>
                    <ConfidenceBar score={result.confidence_score} />
                  </div>

                  <div className="space-y-1 bg-black/10 p-4 rounded-xl border border-white/5">
                    <DataRow label={t('sms_import.result.labels.bank')} value={result.bank_name} accentClass="text-slate-200 font-bold" />
                    <DataRow label={t('sms_import.result.labels.account_ref')} value={result.account_number} accentClass="text-sky" />
                    <DataRow label={t('sms_import.result.labels.tx_id')} value={result.transaction_id} />
                    <DataRow label={t('sms_import.result.labels.datetime')} value={result.transaction_datetime} />
                    <DataRow label={t('sms_import.result.labels.balance_after')} value={result.balance_after !== null && result.balance_after !== undefined ? `${Number(result.balance_after).toLocaleString(uiLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${result.currency || 'MZN'}` : null} accentClass="text-aurora" />
                    <DataRow label={t('sms_import.result.labels.fee')} value={result.fee_amount ? `${Number(result.fee_amount).toLocaleString(uiLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${result.currency || 'MZN'}` : null} accentClass="text-coral" />
                    <DataRow label={t('sms_import.result.labels.recipient')} value={result.recipient_name} />
                    <DataRow label={t('sms_import.result.labels.recipient_acc')} value={result.recipient_account} />
                    <DataRow label={t('sms_import.result.labels.agent')} value={result.agent_code} />
                    <DataRow label={t('sms_import.result.labels.description')} value={ui(result.description)} />
                  </div>

                  <div className="mt-6 space-y-3">
                    {state.contas?.length > 0 && (
                      <label className="block text-xs text-slate-600 dark:text-slate-400">
                        <span className="block mb-2 tracking-wider">{ui('Conta')}</span>
                        <select
                          id="sms-import-account"
                          className="form-input w-full"
                          value={accountId}
                          onChange={(e) => {
                            setAccountId(e.target.value);
                            setSyncBalance(shouldSyncBalance(result, e.target.value, state.transacoes));
                          }}
                        >
                          <option value="">{ui('Sem conta')}</option>
                          {state.contas.map((c) => (
                            <option key={c.id} value={String(c.id)}>{c.name}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    {balancePreview && (
                      <label className="flex items-start gap-3 rounded-xl border border-aurora/30 bg-aurora/5 p-3 text-xs text-slate-300 leading-5 cursor-pointer">
                        <input
                          id="sms-import-sync-balance"
                          type="checkbox"
                          className="mt-1 h-4 w-4 shrink-0 accent-[#2ecc71]"
                          checked={syncBalance}
                          onChange={(e) => setSyncBalance(e.target.checked)}
                        />
                        <span>
                          <span className="block font-bold text-aurora">
                            {uiFill('Acertar o saldo de {{p0}} para {{p1}}', { p0: balancePreview.name, p1: formatMzn(balancePreview.smsBalance, result.currency || 'MZN') })}
                          </span>
                          <span className="block text-slate-600 dark:text-slate-400">
                            {Math.abs(balancePreview.difference) < 0.005
                              ? ui('Bate certo com o saldo no Mwanga depois desta transação.')
                              : uiFill('No Mwanga ficaria {{p0}}. A diferença de {{p1}} fica registada como ajuste de saldo.', { p0: formatMzn(balancePreview.expected, result.currency || 'MZN'), p1: formatMzn(Math.abs(balancePreview.difference), result.currency || 'MZN') })}
                          </span>
                          {!syncBalance && !shouldSyncBalance(result, accountId, state.transacoes) && (
                            <span className="block text-gold">{ui('Esta conta já tem movimentos mais recentes do que esta mensagem.')}</span>
                          )}
                        </span>
                      </label>
                    )}
                    {saveError && (
                      <div role="alert" className="flex items-start gap-2 rounded-xl border border-coral/40 bg-coral/10 p-3 text-xs text-coral leading-5">
                        <AlertCircle size={16} className="shrink-0 mt-1" />
                        <span>{saveError}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={saveTransaction}
                      disabled={saving || quotaReached}
                      className="w-full py-3 bg-aurora/20 hover:bg-aurora/30 text-aurora border border-aurora/40 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(46,204,113,0.1)] hover:shadow-[0_0_20px_rgba(46,204,113,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                      {saving ? t('common.saving') : t('sms_import.result.btn_confirm')}
                    </button>
                    <p className="text-center text-[10px] text-slate-600 dark:text-slate-400 leading-5">
                      {t('sms_import.result.save_hint')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card flex flex-col items-center justify-center min-h-[400px] text-center p-8 border-dashed border-white/20">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <MessageSquare size={24} className="text-slate-600 dark:text-slate-400" />
              </div>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-mono text-sm max-w-[260px]">
                {t('sms_import.description')}
              </p>
            </div>
          )}

          {result && (
            <div className="glass-card overflow-hidden opacity-60 hover:opacity-100 transition-opacity">
              <div className="px-4 py-2 border-b border-white/5 text-[10px] text-slate-600 dark:text-slate-400 tracking-widest font-bold">
                PAYLOAD JSON (API)
              </div>
              <pre className="p-4 text-[10px] text-slate-600 dark:text-slate-400 overflow-auto max-h-[220px] font-mono leading-relaxed bg-black/40">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
