import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Share2, UserPlus } from 'lucide-react';
import api from '../../utils/api';

export default function HouseholdSettings({ showToast }) {
  const { t } = useTranslation();
  const [members, setMembers] = useState([]);
  const [invite, setInvite] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/households/members').then(({ data }) => { if (!cancelled) setMembers(data.members || []); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  async function generate() {
    setBusy(true);
    try {
      const { data } = await api.post('/households/generate');
      setInvite(data);
    } catch {
      showToast(t('settings.household.error'), 'error');
    } finally {
      setBusy(false);
    }
  }

  const shareText = invite ? t('settings.household.share_text', { code: invite.inviteCode }) : '';

  async function share() {
    try {
      if (navigator.share) await navigator.share({ text: shareText });
      else { await navigator.clipboard.writeText(shareText); showToast(t('settings.household.copied'), 'success'); }
    } catch { /* the user closed the share sheet */ }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(invite.inviteCode); showToast(t('settings.household.copied'), 'success'); }
    catch { showToast(t('settings.household.error'), 'error'); }
  }

  return <section className="glass-card p-6 md:p-10 space-y-6">
    <div>
      <h2 className="text-xl font-black">{t('settings.household.title')}</h2>
      <p className="text-sm text-slate-500 mt-2">{t('settings.household.description')}</p>
    </div>

    <div>
      <h3 className="text-sm font-bold mb-3">{t('settings.household.members')}</h3>
      <ul className="space-y-2">
        {members.map(member => <li key={member.id} className="flex items-center justify-between gap-3 text-sm">
          <span className="font-semibold">{member.name}</span>
          <span className="text-slate-500 truncate">{member.email}</span>
        </li>)}
      </ul>
    </div>

    {invite ? <div className="space-y-3">
      <p className="text-sm">{t('settings.household.code_label')}</p>
      <p className="text-3xl font-black tracking-[0.3em]">{invite.inviteCode}</p>
      <p className="text-xs text-slate-500">{t('settings.household.code_note')}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn btn-primary" onClick={share}><Share2 size={16} />{t('settings.household.share')}</button>
        <button type="button" className="btn btn-ghost" onClick={copy}><Copy size={16} />{t('settings.household.copy')}</button>
      </div>
    </div> : <button type="button" className="btn btn-primary" disabled={busy} onClick={generate}><UserPlus size={16} />{t('settings.household.invite')}</button>}
  </section>;
}
