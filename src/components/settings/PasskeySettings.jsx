import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fingerprint } from 'lucide-react';
import api from '../../utils/api';
import { passkeysAvailable, registerPasskey } from '../../utils/passkeys';

export default function PasskeySettings({ showToast }) {
  const { t } = useTranslation();
  const [passkeys, setPasskeys] = useState([]);
  const [busy, setBusy] = useState(false);
  const available = passkeysAvailable();

  async function load() {
    try { const { data } = await api.get('/auth/webauthn/passkeys'); setPasskeys(Array.isArray(data) ? data : []); }
    catch { /* section stays in its empty state */ }
  }
  useEffect(() => { if (available) load(); }, [available]);

  if (!available) return null;

  async function enable() {
    setBusy(true);
    try { await registerPasskey(); showToast(t('settings.passkeys.enabled'), 'success'); await load(); }
    catch { showToast(t('settings.passkeys.error'), 'error'); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    setBusy(true);
    try { await api.delete(`/auth/webauthn/passkeys/${id}`); await load(); }
    catch { showToast(t('settings.passkeys.error'), 'error'); }
    finally { setBusy(false); }
  }

  return <section className="glass-card p-6 md:p-10 mt-6 space-y-4">
    <h2 className="text-xl font-black">{t('settings.passkeys.title')}</h2>
    <p className="text-sm text-slate-500">{t('settings.passkeys.description')}</p>
    <ul className="space-y-2 text-sm">
      {passkeys.map(passkey => <li key={passkey.id} className="flex items-center justify-between gap-3">
        <span>{t('settings.passkeys.device', { date: new Date(passkey.created_at).toLocaleDateString() })}</span>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => remove(passkey.id)}>{t('settings.passkeys.remove')}</button>
      </li>)}
    </ul>
    <button type="button" className="btn btn-primary" disabled={busy} onClick={enable}><Fingerprint size={16} />{t('settings.passkeys.add')}</button>
  </section>;
}
