import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Gift, Clock } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';
import { apiCall } from '../../services/finance.service';
import { getTrialStatus } from '../../config/features';

const DISMISS_KEY = 'mwanga-trial-offer-dismissed-until';
const DISMISS_DAYS = 7;

function isOfferSnoozed() {
  try { return Number(localStorage.getItem(DISMISS_KEY) || 0) > Date.now(); } catch { return false; }
}

/**
 * Offers the Growth trial to households that have used Mwanga for a month,
 * and shows the days left while it runs (with a stronger notice near the end).
 */
export default function TrialBanner() {
  const { t } = useTranslation();
  const { state, reloadData } = useFinance();
  const { showToast } = useOutletContext?.() || { showToast: console.log };
  const navigate = useNavigate();
  const [snoozed, setSnoozed] = useState(isOfferSnoozed);
  const [starting, setStarting] = useState(false);

  const trial = getTrialStatus(state.settings, state.user?.created_at);

  if (trial.active) {
    const key = trial.endingSoon ? 'dashboard.trial.ending' : 'dashboard.trial.active';
    return (
      <section style={{ padding: '1rem' }} className={`glass-card flex flex-wrap items-center justify-between gap-3 ${trial.endingSoon ? 'border border-gold' : ''}`} role="status">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Clock size={16} className="text-gold shrink-0" /> {t(key, { count: trial.daysLeft })}
        </p>
        <button type="button" className="btn btn-ghost" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }} onClick={() => navigate('/pricing')}>
          {t('dashboard.trial.see_plans')}
        </button>
      </section>
    );
  }

  if (!trial.eligible || snoozed) return null;

  const snooze = () => {
    setSnoozed(true);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000)); } catch { /* storage unavailable */ }
  };

  const startTrial = async () => {
    setStarting(true);
    try {
      await apiCall('settings/trial', 'POST');
      await reloadData();
      showToast(t('dashboard.trial.started'));
    } catch {
      showToast(t('dashboard.trial.error'));
    } finally {
      setStarting(false);
    }
  };

  return (
    <section className="glass-card flex flex-col gap-3" style={{ padding: '1.25rem' }}>
      <h2 className="flex items-center gap-2 font-black text-lg">
        <Gift size={20} className="text-gold shrink-0" /> {t('dashboard.trial.offer_title')}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.trial.offer_body')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary" disabled={starting} onClick={startTrial}>
          {t('dashboard.trial.offer_cta')}
        </button>
        <button type="button" className="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:underline" onClick={snooze}>
          {t('dashboard.trial.offer_dismiss')}
        </button>
      </div>
    </section>
  );
}
