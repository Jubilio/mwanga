import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import api from '../utils/api';
export default function RealityReviewBanner() {
  const { t } = useTranslation();
  const { state } = useFinance();
  const userId = state.user?.id;
  const loading = state.loading;
  const [signal, setSignal] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!userId || loading) return;
    let cancelled = false, last = 0;
    const visit = async () => {
      if (document.visibilityState === 'hidden' || Date.now() - last < 5 * 60000) return;
      last = Date.now();
      try { const { data } = await api.post('/reality-review/visit'); if (!cancelled) setSignal({ ...data, userId }); }
      catch { /* Activity tracking must not block use of the app. */ }
    };
    const refresh = async () => {
      try { const { data } = await api.get('/reality-review'); if (!cancelled) setSignal({ ...data.status, userId }); }
      catch { /* The review remains accessible in settings. */ }
    };
    visit();
    document.addEventListener('visibilitychange', visit);
    window.addEventListener('mwanga-reality-reviewed', refresh);
    const interval = setInterval(visit, 30 * 60000);
    return () => { cancelled = true; clearInterval(interval); document.removeEventListener('visibilitychange', visit); window.removeEventListener('mwanga-reality-reviewed', refresh); };
  }, [userId, loading]);
  async function defer() {
    setBusy(true);
    try { await api.patch('/reality-review', { action: 'defer' }); setSignal(previous => ({ ...previous, prompt: false })); }
    finally { setBusy(false); }
  }
  if (!signal?.prompt || signal.userId !== userId) return null;
  return <section className="glass-card p-5 mb-6 border border-amber-500/30" aria-label={t('reality.banner_title')}>
    <h2 className="font-black text-lg">{t('reality.banner_title')}</h2>
    <p className="text-sm text-slate-500 mt-2">{t('reality.banner_body')}</p>
    <div className="flex flex-wrap gap-3 mt-4"><Link to="/rever-realidade" className="btn btn-primary">{t('reality.review_now')}</Link><button disabled={busy} onClick={() => defer().catch(() => {})} className="btn btn-ghost">{t('reality.later')}</button></div>
  </section>;
}
