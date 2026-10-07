import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../hooks/useFinance';
import { JOURNEY_SETTING_KEY, readJourney, buildJourneyReview, dayKey } from '../utils/financialJourney';
import { fmt } from '../utils/calculations';
import PlanEditor from '../components/journey/PlanEditor';
import JourneyReview from '../components/journey/JourneyReview';
import JourneyLearning from '../components/journey/JourneyLearning';
import JourneyScenarios from '../components/journey/JourneyScenarios';

export default function FinancialJourney() {
  const { t } = useTranslation();
  const { state, dispatch, reloadData } = useFinance();
  const navigate = useNavigate();
  const raw = state.settings?.[JOURNEY_SETTING_KEY];
  const journey = useMemo(() => readJourney(raw), [raw]);
  const today = dayKey();
  const review = useMemo(() => buildJourneyReview(state, journey, today), [state, journey, today]);
  const [tab, setTab] = useState('plan');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [notice, setNotice] = useState('');
  async function save(next) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setNotice('');
    try {
      await dispatch({ type: 'SAVE_JOURNEY', payload: readJourney(next) });
      setNotice('saved');
      return true;
    } catch { setNotice('save_error'); return false; }
    finally { saving.current = false; setBusy(false); }
  }
  const ask = ({ title, body }) => navigate('/insights', { state: { journeyPrompt: t('journey.ask_prompt', {
    start: review.start, end: review.end, income: fmt(review.income, 'MT'), expenses: fmt(review.expenses, 'MT'), title, body,
  }) } });
  const links = [['budget', '/orcamento'], ['debts', '/dividas'], ['goals', '/metas'], ['assets', '/patrimonio'], ['simulators', '/simuladores'], ['reports', '/relatorio'], ['binth', '/insights']];
  return <div className="space-y-6 pb-28">
    <header><p className="text-xs font-black uppercase tracking-widest text-ocean dark:text-aurora">{t('journey.brand')}</p><h1 className="text-3xl font-black mt-2">{t('journey.title')}</h1><p className="text-gray-500 dark:text-gray-400 mt-3">{t('journey.subtitle')}</p><p className="text-xs mt-3 text-gray-500 dark:text-gray-400">{t('journey.shared')} {t('journey.base_currency')}</p></header>
    <nav className="flex flex-wrap gap-2" aria-label={t('journey.nav')}>
      {['plan', 'review', 'learn'].map(id => <button key={id} onClick={() => setTab(id)} aria-pressed={tab === id} className={`btn ${tab === id ? 'btn-primary' : 'btn-ghost'}`}>{t(`journey.${id}_tab`)}</button>)}
    </nav>
    {notice ? <p role={notice === 'save_error' ? 'alert' : 'status'} className={notice === 'save_error' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}>{t(`journey.${notice}`)}</p> : null}
    {tab === 'plan' ? <>
      {editing || !journey.purpose ? <PlanEditor journey={journey} goals={state.metas || []} busy={busy} reloadData={reloadData} onCancel={journey.purpose ? () => setEditing(false) : undefined} onSave={async next => { if (await save(next)) setEditing(false); }} /> : <section className="glass-card p-5 sm:p-7 space-y-4">
        <h2 className="text-xl font-black">{t('journey.plan.title')}</h2><p className="text-lg font-bold break-words">{journey.purpose}</p><p className="text-sm">{t(`journey.priorities.${journey.priority}`)}</p>
        <p>{t('journey.plan.contribution')}: <strong>{fmt(journey.monthlyContribution, 'MT')}</strong></p>
        {review.goal ? <>
          <Link to="/metas" className="font-bold underline underline-offset-4">{review.goal.nome}</Link>
          <progress value={review.goalStats.percent} max={100} aria-label={review.goal.nome} className="block w-full h-3 accent-emerald-500" />
          <p className="text-sm">{t('journey.remaining')}: {fmt(review.goalStats.remaining, 'MT')}</p>
          <p className="text-sm">{review.goalStats.remaining === 0 ? t('journey.plan.achieved') : review.goalStats.overdue ? t('journey.plan.overdue') : review.goalStats.required === null ? t('journey.plan.no_deadline') : `${t('journey.plan.monthly_required')}: ${fmt(review.goalStats.required, 'MT')}`}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('journey.plan.required_note')}</p>
        </> : <p className="text-sm">{t(journey.goalId ? 'journey.plan.goal_missing' : 'journey.plan.none')}</p>}
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('journey.plan.plan_not_transfer')}</p>
        <button onClick={() => setEditing(true)} className="btn btn-primary">{t('journey.edit')}</button>
      </section>}
      {review.goal ? <JourneyScenarios saved={review.goalStats.saved} contribution={journey.monthlyContribution} /> : null}
      <section className="glass-card p-5 sm:p-7"><h2 className="text-lg font-black mb-4">{t('journey.links.title')}</h2><div className="flex flex-wrap gap-3">{links.map(([id, route]) => <Link key={id} to={route} className="btn btn-ghost">{t(`journey.links.${id}`)}</Link>)}</div></section>
    </> : null}
    {tab === 'review' ? <JourneyReview review={review} busy={busy} checkedToday={journey.closedDays.includes(today)} completedLessons={journey.completedLessons.length} onAsk={ask} onReview={() => save({ ...journey, reviewedWeeks: [...new Set([...journey.reviewedWeeks, review.currentWeek])].sort().slice(-52) })} onCheckDay={() => save({ ...journey, closedDays: [...new Set([...journey.closedDays, today])].sort().slice(-90) })} /> : null}
    {tab === 'learn' ? <JourneyLearning completedLessons={journey.completedLessons} busy={busy} onToggle={id => save({ ...journey, completedLessons: journey.completedLessons.includes(id) ? journey.completedLessons.filter(item => item !== id) : [...journey.completedLessons, id] })} /> : null}
  </div>;
}
