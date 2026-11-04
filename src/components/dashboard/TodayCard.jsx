import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarClock, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import { apiCall } from '../../services/finance.service';
import { useFinance } from '../../hooks/useFinance';
import { runProposal } from '../../utils/advisorProposal';
import { toRequestId } from '../../utils/offlineQueue';
import { fmt } from '../../utils/calculations';
import { maskAmounts } from '../../utils/advisorProposal';


// "Hoje": the one thing Binth thinks matters today, and where the money goes
// until payday. Everything here comes from rules on the server, not from AI.
export default function TodayCard({ hidden = false }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useFinance();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  const fetchToday = useCallback(async () => {
    try {
      setData(await apiCall('advisor/today'));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);
  const load = () => { setStatus('loading'); fetchToday(); };

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const top = data?.top;
  const forecast = data?.forecast;

  async function act() {
    if (!top?.action) return;
    if (top.action.type !== 'proposal') { navigate(top.action.to || '/plano'); return; }
    setBusy(true);
    try {
      const outcome = await runProposal(top.action.proposal, { dispatch, state, requestId: toRequestId(`advisor-${top.id}`) || undefined });
      setDone(outcome);
    } catch {
      setDone('failed');
    } finally {
      setBusy(false);
    }
  }

  if (status === 'loading') {
    return (
      <section aria-busy="true" aria-label={t('advisor.today.title')} className="glass-card p-6">
        <div className="h-4 w-24 rounded bg-black/5 dark:bg-white/10" />
        <div className="mt-4 h-5 w-3/4 rounded bg-black/5 dark:bg-white/10" />
        <div className="mt-2 h-4 w-full rounded bg-black/5 dark:bg-white/10" />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="glass-card p-6">
        <p className="text-sm text-[var(--color-muted)]">{t('advisor.today.error')}</p>
        <button type="button" onClick={load} className="btn-secondary mt-4 inline-flex min-h-[44px] items-center gap-2 px-4">
          <RefreshCw size={16} aria-hidden="true" /> {t('advisor.retry')}
        </button>
      </section>
    );
  }

  const runout = forecast?.runoutDate && forecast.runoutDate < forecast.horizon;
  const horizonLabel = forecast?.horizonIsPayday ? t('advisor.today.until_payday', { date: forecast.horizon.slice(8, 10) + '/' + forecast.horizon.slice(5, 7) }) : t('advisor.today.next_30');

  return (
    <section aria-labelledby="today-title" className="glass-card p-6">
      <div className="flex items-center justify-between">
        <h2 id="today-title" className="flex items-center gap-2 text-sm font-bold text-[var(--color-muted)]">
          <Sparkles size={16} aria-hidden="true" /> {t('advisor.today.title')}
        </h2>
        <button type="button" onClick={() => navigate('/plano')} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-[var(--color-sky)]">
          {t('advisor.today.open_plan')} <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      {top ? (
        <div className="mt-2">
          <p className="text-base font-bold text-[var(--color-text)]">{maskAmounts(top.title, hidden)}</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{maskAmounts(top.body, hidden)}</p>
          {done ? (
            <p role="status" className={`mt-4 text-sm font-bold ${done === 'failed' ? 'text-[var(--color-coral)]' : 'text-[var(--color-leaf)]'}`}>
              {t(done === 'failed' ? 'binth_actions.failed' : `binth_actions.${done}`)}
            </p>
          ) : top.action && (
            <button type="button" onClick={act} disabled={busy} className="btn-secondary mt-4 min-h-[44px] px-4 font-bold">
              {busy ? t('binth_actions.saving') : top.action.label}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--color-muted)]">{t('advisor.today.all_good')}</p>
      )}

      {forecast && (
        <div className="mt-6 flex items-start gap-2 border-t border-black/5 pt-4 text-sm dark:border-white/10">
          <CalendarClock size={16} className="mt-0.5 shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
          <p className="text-[var(--color-muted)]">
            {horizonLabel}{': '}
            {runout
              ? <span className="font-bold text-[var(--color-coral)]">{t('advisor.today.runs_out', { date: forecast.runoutDate.slice(8, 10) + '/' + forecast.runoutDate.slice(5, 7) })}</span>
              : <span className="font-bold tabular-nums text-[var(--color-text)]">{hidden ? '•••' : t('advisor.today.left', { amount: fmt(forecast.endBalance) })}</span>}
          </p>
        </div>
      )}
      <p className="mt-4 text-xs text-[var(--color-muted)]">{data?.disclaimer}</p>
    </section>
  );
}
