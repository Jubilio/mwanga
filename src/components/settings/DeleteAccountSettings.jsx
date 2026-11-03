import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { clearToken } from '../../utils/authToken';

const CONFIRMATION_WORD = 'APAGAR';

// Apagar conta dentro da app: exigido pela Google Play e pelas regras de
// protecção de dados. O servidor apaga tudo numa só transacção.
export default function DeleteAccountSettings() {
  const { t } = useTranslation();
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const ready = confirmation.trim().toUpperCase() === CONFIRMATION_WORD;

  async function submit(event) {
    event.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setStatus('');
    try {
      await api.delete('/auth/account', { data: { confirmation: confirmation.trim() } });
      setStatus('done');
      clearToken();
      window.location.assign('/');
    } catch {
      setStatus('error');
      setBusy(false);
    }
  }

  return <section className="glass-card p-6 md:p-10 mt-6" style={{ borderColor: 'rgba(239,68,68,0.35)' }} aria-labelledby="delete-account-title">
    <h2 id="delete-account-title" className="text-xl font-bold text-red-600 dark:text-red-400">{t('settings.delete_account.title')}</h2>
    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{t('settings.delete_account.body')}</p>
    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 mb-6">{t('settings.delete_account.shared_note')}</p>
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
        <label className="block text-sm font-bold" htmlFor="delete-account-confirm">
          {t('settings.delete_account.label')}
          <input id="delete-account-confirm" type="text" autoComplete="off" autoCapitalize="characters" value={confirmation} onChange={event => { setConfirmation(event.target.value); setStatus(''); }} className="form-input block w-full mt-2" />
        </label>
        <button type="submit" disabled={!ready || busy} className="btn w-full sm:w-auto" style={{ background: ready ? '#dc2626' : undefined, color: ready ? '#fff' : undefined }}>
          {t(busy ? 'settings.delete_account.busy' : 'settings.delete_account.button')}
        </button>
      </fieldset>
      {status ? <p className="text-sm mt-3" role={status === 'done' ? 'status' : 'alert'}>{t(`settings.delete_account.${status}`)}</p> : null}
    </form>
  </section>;
}
