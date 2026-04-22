import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clipboard, MessageSquare, RefreshCw, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import api from '../utils/api';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';

const SAMPLE_SMS = [
  'A conta 406659018 foi debitada no valor de 20.00 MZN as 23:17 do dia 24/02/26. Millennium bim',
  'mKesh: Transferiste 1,500.00MT para Fatima Macie (845123456). Taxa: 15.00MT. Saldo: 8,230.50MT. Ref: TXN20260224001',
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
  deposit: { bg: 'bg-emerald-500/10', border: 'border-emerald-500', text: 'text-emerald-400', label: t('sms_import.result.labels.description') },
  payment: { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-400', label: t('sms_import.result.labels.description') },
  fee: { bg: 'bg-coral/10', border: 'border-coral', text: 'text-coral', label: t('sms_import.result.labels.description') },
  unknown: { bg: 'bg-slate-500/10', border: 'border-slate-500', text: 'text-slate-400', label: t('common.categories.other') },
});

function ConfidenceBar({ score }) {
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
  if (value === null || value === undefined || value === '') return null;

  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-slate-400 text-xs font-mono uppercase tracking-wider min-w-[120px]">{label}</span>
      <span className={`text-sm font-medium text-right max-w-[260px] break-words ${accentClass || 'text-slate-200'}`}>
        {String(value)}
      </span>
    </div>
  );
}

function inferTransactionType(result) {
  return ['credit', 'deposit', 'transfer_in'].includes(result.transaction_type) ? 'receita' : 'despesa';
}

function inferCategory(result) {
  const type = result.transaction_type;
  if (type === 'withdrawal') return 'other';
  if (type === 'transfer_out' || type === 'transfer_in') return 'transport';
  if (type === 'payment' || type === 'debit') return 'other';
  if (type === 'credit' || type === 'deposit') return 'salary';
  if (type === 'fee') return 'other';
  return 'other';
}

function buildDescription(result, t) {
  const types = TYPE_COLORS(t);
  const label = types[result.transaction_type]?.label || result.transaction_type || 'Movimento';
  const extras = [result.recipient_name, result.agent_code].filter(Boolean).join(' • ');
  return [result.bank_name || 'SMS', label, extras].filter(Boolean).join(' - ').slice(0, 255);
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [smsText, setSmsText] = useState(SAMPLE_SMS[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pasteLoading, setPasteLoading] = useState(false);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const textareaRef = useRef(null);

  const typeInfo = useMemo(() => {
    if (!result?.transaction_type) return null;
    const types = TYPE_COLORS(t);
    return types[result.transaction_type] || types.unknown;
  }, [result?.transaction_type, t]);
  const incomingSharedText = useMemo(
    () => searchParams.get('text') || searchParams.get('sms') || searchParams.get('body') || '',
    [searchParams],
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
      showToast('SMS analisado com sucesso!', 'success');
    } catch (error) {
      console.error(error);
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        showToast('A análise demorou demasiado. Verifique a sua conexão e tente novamente.', 'error');
      } else {
        showToast(error.response?.data?.message || error.response?.data?.error || 'Erro ao processar o SMS.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

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
    if (!result || !result.is_financial || !result.amount) return;

    setSaving(true);
    try {
      const payload = {
        date: result.transaction_datetime ? result.transaction_datetime.split('T')[0] : new Date().toISOString().slice(0, 10),
        type: inferTransactionType(result),
        amount: Number(result.amount),
        description: buildDescription(result),
        category: inferCategory(result),
        note: buildNote(result, smsText),
      };

      await api.post('/transactions', payload);
      showToast(t('sms_import.toasts.save_success'), 'success');
      setResult(null);
      setSmsText('');
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.error || t('sms_import.toasts.save_error'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-6 w-full max-w-none font-mono">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Zap className="text-gold" />
          {t('sms_import.title')}
        </h1>
        <p className="text-slate-400 mt-2">
          {t('sms_import.description')}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-6 min-w-0">
          <div className="glass-card overflow-hidden">
            <div className="bg-white/5 border-b border-white/5 p-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-coral" />
                <div className="w-2.5 h-2.5 rounded-full bg-gold" />
                <div className="w-2.5 h-2.5 rounded-full bg-aurora" />
              </div>
              <span className="ml-2 text-xs text-slate-400 tracking-widest font-semibold flex items-center gap-2">
                <MessageSquare size={14} /> {t('sms_import.input_header')}
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-2xl border border-sky/20 bg-sky/5 p-4 text-xs text-slate-300 leading-6">
                <div className="flex items-center gap-2 font-bold text-sky mb-2">
                  <Smartphone size={14} /> {t('sms_import.mobile_tip.title')}
                </div>
                <p>
                  {t('sms_import.mobile_tip.desc')}
                </p>
              </div>

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

          <div className="glass-card p-5">
            <div className="text-xs text-slate-400 tracking-widest font-semibold mb-4">{t('sms_import.examples_header')}</div>
            <div className="flex flex-col gap-2">
              {SAMPLE_SMS.map((sample, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => setSmsText(sample)}
                  className={`p-3 rounded-lg text-xs text-left transition-all border leading-relaxed ${
                    smsText === sample
                      ? 'bg-gold/10 border-gold/40 text-gold shadow-[0_0_10px_rgba(201,150,58,0.1)]'
                      : 'bg-black/20 border-white/5 text-slate-400 hover:bg-white/5 hover:text-slate-300'
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
              <div className={`px-5 py-4 border-b ${typeInfo?.bg || 'bg-white/5'} border-white/10 flex items-center justify-between gap-3`}>
                {result.is_financial === false ? (
                  <span className="text-sm font-bold text-slate-400 flex items-center gap-2">
                    <AlertCircle size={16} /> {t('sms_import.result.non_financial')}
                  </span>
                ) : (
                  <>
                    <span className={`text-xs font-bold border rounded-md px-2.5 py-1 tracking-wider ${typeInfo?.border} ${typeInfo?.text} bg-black/20`}>
                      {typeInfo?.label || 'UNKNOWN'}
                    </span>
                    <span className="text-lg md:text-xl font-bold text-white tracking-tight text-right break-words">
                      {result.amount ? `${Number(result.amount).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${result.currency || 'MZN'}` : '—'}
                    </span>
                  </>
                )}
              </div>

              {result.is_financial !== false && (
                <div className="p-5">
                  <div className="mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2 gap-3">
                      <span className="text-xs text-slate-400 tracking-widest font-semibold flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-aurora" /> {t('sms_import.result.confidence_label')}
                      </span>
                      {result.confidence_score >= 0.8 && (
                        <span className="text-[10px] bg-aurora/20 text-aurora px-2 py-0.5 rounded-full">{t('sms_import.result.confidence_high')}</span>
                      )}
                    </div>
                    <ConfidenceBar score={result.confidence_score} />
                  </div>

                  <div className="space-y-1 bg-black/10 p-4 rounded-xl border border-white/5">
                    <DataRow label={t('sms_import.result.labels.bank')} value={result.bank_name} accentClass="text-slate-200 font-bold" />
                    <DataRow label={t('sms_import.result.labels.account_ref')} value={result.account_number} accentClass="text-sky" />
                    <DataRow label={t('sms_import.result.labels.tx_id')} value={result.transaction_id} />
                    <DataRow label={t('sms_import.result.labels.datetime')} value={result.transaction_datetime} />
                    <DataRow label={t('sms_import.result.labels.balance_after')} value={result.balance_after !== null && result.balance_after !== undefined ? `${Number(result.balance_after).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${result.currency || 'MZN'}` : null} accentClass="text-aurora" />
                    <DataRow label={t('sms_import.result.labels.fee')} value={result.fee_amount ? `${Number(result.fee_amount).toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${result.currency || 'MZN'}` : null} accentClass="text-coral" />
                    <DataRow label={t('sms_import.result.labels.recipient')} value={result.recipient_name} />
                    <DataRow label={t('sms_import.result.labels.recipient_acc')} value={result.recipient_account} />
                    <DataRow label={t('sms_import.result.labels.agent')} value={result.agent_code} />
                    <DataRow label={t('sms_import.result.labels.description')} value={result.description} />
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      onClick={saveTransaction}
                      disabled={saving || !result.amount}
                      className="w-full py-3 bg-aurora/20 hover:bg-aurora/30 text-aurora border border-aurora/40 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(46,204,113,0.1)] hover:shadow-[0_0_20px_rgba(46,204,113,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                      {t('sms_import.result.btn_confirm')}
                    </button>
                    <p className="text-center text-[10px] text-slate-500 leading-5">
                      {t('sms_import.result.save_hint')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card flex flex-col items-center justify-center min-h-[400px] text-center p-8 border-dashed border-white/20">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <MessageSquare size={24} className="text-slate-500" />
              </div>
              <p className="text-slate-400 leading-relaxed font-mono text-sm max-w-[260px]">
                {t('sms_import.description')}
              </p>
            </div>
          )}

          {result && (
            <div className="glass-card overflow-hidden opacity-60 hover:opacity-100 transition-opacity">
              <div className="px-4 py-2 border-b border-white/5 text-[10px] text-slate-400 tracking-widest font-semibold">
                PAYLOAD JSON (API)
              </div>
              <pre className="p-4 text-[10px] text-slate-400 overflow-auto max-h-[220px] font-mono leading-relaxed bg-black/40">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
