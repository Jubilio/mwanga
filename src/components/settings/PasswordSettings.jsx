import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function PasswordSettings({ dispatch }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [status, setStatus] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (lock.current) return;
    if (password.length < 8 || password.length > 100) { setStatus('password_length'); return; }
    if (password !== confirmation) { setStatus('password_mismatch'); return; }
    lock.current = true;
    setBusy(true);
    setStatus('');
    try {
      await dispatch({ type: 'UPDATE_USER', payload: { password } });
      setPassword(''); setConfirmation(''); setStatus('password_saved');
    } catch { setStatus('password_error'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="glass-card p-6 md:p-10 mt-6">
    <h2 className="text-xl font-black">{t('settings.reliable.password_title')}</h2>
    <p className="text-sm text-slate-500 mt-2 mb-5">{t('settings.reliable.password_note')}</p>
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
        <label className="block text-sm font-bold" htmlFor="settings-password">{t('settings.reliable.new_password')}<input id="settings-password" type="password" autoComplete="new-password" required minLength={8} maxLength={100} value={password} onChange={event => { setPassword(event.target.value); setStatus(''); }} className="form-input block w-full mt-2" /></label>
        <label className="block text-sm font-bold" htmlFor="settings-password-confirm">{t('settings.reliable.confirm_password')}<input id="settings-password-confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={100} value={confirmation} onChange={event => { setConfirmation(event.target.value); setStatus(''); }} className="form-input block w-full mt-2" /></label>
        <button type="submit" className="btn btn-primary">{t(busy ? 'settings.reliable.status.saving' : 'settings.reliable.change_password')}</button>
      </fieldset>
      {status ? <p className="text-sm mt-3" role={status === 'password_saved' ? 'status' : 'alert'}>{t(`settings.reliable.${status}`)}</p> : null}
    </form>
  </section>;
}
