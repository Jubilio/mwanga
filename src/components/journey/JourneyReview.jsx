import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { fmt } from '../../utils/calculations';
import { uiCategory } from '../../utils/uiTranslation';

export default function JourneyReview({ review, busy, onReview, onCheckDay, checkedToday, completedLessons, onAsk }) {
  const { t } = useTranslation();
  const money = value => fmt(value, 'MT');
  const evidence = { ...review.action.evidence };
  if (evidence.category) evidence.category = uiCategory(evidence.category);
  for (const key of ['excess', 'difference']) if (evidence[key] !== undefined) evidence[key] = money(evidence[key]);
  const actionTitle = t(`journey.actions.${review.action.id}.title`, evidence);
  const actionBody = t(`journey.actions.${review.action.id}.body`, evidence);
  return (
    <div className="space-y-6">
      <section className="glass-card p-5 sm:p-7">
        <div className="flex items-center gap-3 mb-3"><Sparkles className="text-gold" size={24} /><h2 className="text-xl font-black">{t('journey.review.title')}</h2></div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('journey.review.subtitle')}</p>
        <p className="text-xs font-bold mt-3">{t('journey.review.window', { start: review.start, end: review.end })}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-5">
          {['income', 'expenses', 'saving', 'balance'].map(key => <div key={key} className="rounded-2xl bg-black/5 dark:bg-white/5 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t(`journey.review.${key}`)}</p>
            <p className="font-black mt-2 break-words">{money(review[key])}</p>
          </div>)}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('journey.review.recorded', { count: review.recordCount, days: review.recordedDays })}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{t('journey.review.scope')}</p>
        <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-5">
          <p className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-gold">{t('journey.review.evidence')}</p>
          <h3 className="font-black text-lg mt-3">{actionTitle}</h3>
          <p className="text-sm leading-relaxed mt-2">{actionBody}</p>
          <p className="text-xs mt-3 text-gray-500 dark:text-gray-400">{t('journey.review.month_scope', { month: review.month })}</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link to={review.action.route} className="btn btn-primary">{t('journey.review.action')}</Link>
            <button onClick={() => onAsk({ title: actionTitle, body: actionBody })} className="btn btn-ghost">{t('journey.review.ask')}</button>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 my-5 text-sm">
          <p>{t('journey.review.outstanding')}<strong className="block mt-1">{money(review.outstandingDebt)}</strong></p>
          <p>{t('journey.review.budgets')}<strong className="block mt-1">{review.overBudget.length}</strong></p>
          <p>{t('journey.review.goals')}<strong className="block mt-1">{review.goal?.nome || t('journey.review.none')}</strong></p>
        </div>
        {review.outstandingDebt > 0 ? <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('journey.review.missing_rates')}</p> : null}
        <button disabled={busy || review.reviewed} onClick={onReview} className="btn btn-primary disabled:opacity-60">
          {review.reviewed ? <CheckCircle2 size={18} /> : null}{t(review.reviewed ? 'journey.review.ack_done' : 'journey.review.ack')}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{t('journey.review.record_note')}</p>
      </section>
      <section className="glass-card p-5 sm:p-7">
        <h2 className="text-xl font-black">{t('journey.habits.title')}</h2>
        <div className="flex items-end justify-between gap-3 mt-5"><span className="text-sm font-bold">{t('journey.habits.score')}</span><strong className="text-3xl text-ocean dark:text-aurora">{review.habitProgress}%</strong></div>
        <progress value={review.habitProgress} max={100} aria-label={t('journey.habits.score')} className="w-full h-3 mt-3 accent-emerald-500" />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{t('journey.habits.explanation')}</p>
        <div className="flex flex-wrap gap-4 text-sm font-bold my-5"><span>{t('journey.habits.days', { count: review.closedDays })}</span><span>{t('journey.habits.lessons', { count: completedLessons })}</span></div>
        <button disabled={busy || checkedToday} onClick={onCheckDay} className="btn btn-primary disabled:opacity-60">{t(checkedToday ? 'journey.habits.checked_today' : 'journey.habits.check_today')}</button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{t('journey.habits.daily_note')}</p>
      </section>
    </div>
  );
}
