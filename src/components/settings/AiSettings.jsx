import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
export default function AiSettings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    let cancelled = false;
    api.get('/settings/ai').then(({ data }) => { if (!cancelled) { setStatus(data); setProvider(data.provider); } }).catch(() => { if (!cancelled) setMessage('error'); });
    return () => { cancelled = true; };
  }, []);
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
  return <section className="glass-card p-6 space-y-5">
    <h2 className="text-2xl font-black">{t('ai_settings.title')}</h2>
    <p className="text-sm text-slate-500">{t('ai_settings.scope')}</p>
    <p>{t(status?.configured ? 'ai_settings.configured' : 'ai_settings.default', { provider: status?.provider })}</p>
    {status && !status.storageAvailable ? <p role="alert">{t('ai_settings.unavailable')}</p> : null}
    <label className="block">{t('ai_settings.provider')}<select className="form-input block w-full mt-2" value={provider} disabled={busy} onChange={event => { setProvider(event.target.value); setMessage(''); }}><option value="gemini">Google Gemini</option><option value="groq">Groq</option><option value="openrouter">OpenRouter</option></select></label>
    <label className="block">{t('ai_settings.key')}<input type="password" autoComplete="off" spellCheck={false} maxLength={512} className="form-input block w-full mt-2" value={apiKey} disabled={busy} onChange={event => { setApiKey(event.target.value); setMessage(''); }} /></label>
    <p className="text-xs text-slate-500">{t('ai_settings.privacy')}</p>
    <p className="text-xs text-slate-500">{t('ai_settings.test_note')}</p>
    <div className="flex flex-wrap gap-3"><button className="btn btn-ghost" disabled={busy || apiKey.trim().length < 10} onClick={() => run('test')}>{t('ai_settings.test')}</button><button className="btn btn-primary" disabled={busy || !status?.storageAvailable || apiKey.trim().length < 10} onClick={() => run('save')}>{t('ai_settings.save')}</button><button className="btn btn-ghost" disabled={busy || !status?.configured} onClick={() => run('remove')}>{t('ai_settings.remove')}</button></div>
    {message ? <p role={['error', 'rejected'].includes(message) ? 'alert' : 'status'}>{t(`ai_settings.${message}`)}</p> : null}
  </section>;
}
