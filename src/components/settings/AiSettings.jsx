import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import api from '../../utils/api';

const CONNECT_RESULTS = ['connected', 'cancelled', 'expired', 'failed'];

// Reads ?ai=<result> left by the OpenRouter return page and clears it from the URL.
function takeConnectResult() {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  const result = url.searchParams.get('ai');
  if (!result) return '';
  url.searchParams.delete('ai');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  return CONNECT_RESULTS.includes(result) ? result : '';
}

export default function AiSettings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(() => takeConnectResult());
  const [showManual, setShowManual] = useState(false);
  const [waitingReturn, setWaitingReturn] = useState(false);
  const lock = useRef(false);

  const loadStatus = useCallback(() => api.get('/settings/ai').then(({ data }) => { setStatus(data); setProvider(data.provider); return data; }), []);

  useEffect(() => {
    let cancelled = false;
    api.get('/settings/ai').then(({ data }) => { if (!cancelled) { setStatus(data); setProvider(data.provider); } }).catch(() => { if (!cancelled) setMessage('error'); });
    return () => { cancelled = true; };
  }, []);

  // On Android the approval happens in the system browser; refresh when the user comes back.
  useEffect(() => {
    if (!waitingReturn) return undefined;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      loadStatus().then(data => { if (data.configured && data.provider === 'openrouter') { setMessage('connected'); setWaitingReturn(false); } }).catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible); };
  }, [waitingReturn, loadStatus]);

  async function connectOpenRouter() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('connecting');
    try {
      const native = Capacitor.isNativePlatform();
      const { data } = await api.post('/settings/ai/openrouter/start', { returnTo: native ? 'app' : 'web' });
      if (!/^https:\/\/openrouter\.ai\//.test(data?.url || '')) throw new Error('bad url');
      setWaitingReturn(true);
      setMessage('connect_return');
      // In the Android app this opens the system browser; on the web it navigates in place.
      window.location.assign(data.url);
    } catch (error) {
      setMessage(error.response?.data?.error === 'AI_KEY_STORAGE_UNAVAILABLE' ? 'unavailable' : 'error');
    } finally { lock.current = false; setBusy(false); }
  }

  async function run(action) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      const payload = { provider, apiKey: apiKey.trim() };
      if (action === 'test') { await api.post('/settings/ai/test', payload); setMessage('tested'); }
      else {
        const { data } = action === 'remove' ? await api.delete('/settings/ai') : await api.put('/settings/ai', payload);
        setStatus(data); setProvider(data.provider); setApiKey(''); setMessage(action === 'remove' ? 'removed' : 'saved');
      }
    } catch (error) { setMessage(error.response?.data?.error === 'AI_KEY_REJECTED' ? 'rejected' : 'error'); }
    finally { lock.current = false; setBusy(false); }
  }

  const storageReady = !!status?.storageAvailable;
  const connectedOpenRouter = status?.configured && status?.provider === 'openrouter';
  const isAlert = ['error', 'rejected', 'expired', 'failed', 'unavailable'].includes(message);

  return <section className="glass-card p-6 space-y-5">
    <h2 className="text-2xl font-black">{t('ai_settings.title')}</h2>
    <p className="text-sm text-slate-500">{t('ai_settings.scope')}</p>
    <p>{t(status?.configured ? 'ai_settings.configured' : 'ai_settings.default', { provider: status?.provider })}</p>
    {status && !storageReady ? <p role="alert">{t('ai_settings.unavailable')}</p> : null}

    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
      <h3 className="text-lg font-bold">{t('ai_settings.easy_title')}</h3>
      <p className="text-sm">{t('ai_settings.easy_text')}</p>
      <p className="text-xs text-slate-500">{t('ai_settings.easy_free')}</p>
      <button className="btn btn-primary w-full sm:w-auto" disabled={busy || !storageReady} onClick={connectOpenRouter}>
        {t(connectedOpenRouter ? 'ai_settings.reconnect_openrouter' : 'ai_settings.connect_openrouter')}
      </button>
    </div>

    {message ? <p role={isAlert ? 'alert' : 'status'}>{t(`ai_settings.${message}`)}</p> : null}

    <p className="text-xs text-slate-500">{t('ai_settings.not_possible')}</p>
    <p className="text-xs text-slate-500">{t('ai_settings.fallback_note')}</p>

    <div className="space-y-4">
      <button type="button" className="btn btn-ghost" aria-expanded={showManual} onClick={() => setShowManual(open => !open)}>{t('ai_settings.manual_title')}</button>
      {showManual ? <div className="space-y-4">
        <p className="text-xs text-slate-500">{t('ai_settings.manual_help')}</p>
        <label className="block">{t('ai_settings.provider')}<select className="form-input block w-full mt-2" value={provider} disabled={busy} onChange={event => { setProvider(event.target.value); setMessage(''); }}><option value="gemini">Google Gemini</option><option value="groq">Groq</option><option value="openrouter">OpenRouter</option></select></label>
        <label className="block">{t('ai_settings.key')}<input type="password" autoComplete="off" spellCheck={false} maxLength={512} className="form-input block w-full mt-2" value={apiKey} disabled={busy} onChange={event => { setApiKey(event.target.value); setMessage(''); }} /></label>
        <p className="text-xs text-slate-500">{t('ai_settings.privacy')}</p>
        <p className="text-xs text-slate-500">{t('ai_settings.test_note')}</p>
        <div className="flex flex-wrap gap-3"><button className="btn btn-ghost" disabled={busy || apiKey.trim().length < 10} onClick={() => run('test')}>{t('ai_settings.test')}</button><button className="btn btn-primary" disabled={busy || !storageReady || apiKey.trim().length < 10} onClick={() => run('save')}>{t('ai_settings.save')}</button></div>
      </div> : null}
      <button className="btn btn-ghost" disabled={busy || !status?.configured} onClick={() => run('remove')}>{t('ai_settings.remove')}</button>
    </div>
  </section>;
}
