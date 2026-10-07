import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { LESSONS } from '../../utils/financialJourney';

export default function JourneyLearning({ completedLessons, busy, onToggle }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-5">
      <div className="glass-card p-5 sm:p-7">
        <h2 className="text-xl font-black flex items-center gap-3"><BookOpen className="text-ocean dark:text-sky" />{t('journey.learn.title')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{t('journey.learn.body')}</p>
        <p className="text-sm font-bold mt-3">{t('journey.habits.lessons', { count: completedLessons.length })}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {LESSONS.map((lesson, index) => {
          const completed = completedLessons.includes(lesson.id);
          return <article key={lesson.id} className="glass-card p-5 flex flex-col">
            <div className="flex items-center justify-between text-xs font-black text-ocean dark:text-sky"><span>{t('journey.learn.lesson', { number: index + 1 })}</span>{completed ? <CheckCircle2 aria-label={t('journey.done')} size={20} /> : null}</div>
            <h3 className="font-black text-lg mt-3">{t(`journey.lessons.${lesson.id}.title`)}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mt-3">{t(`journey.lessons.${lesson.id}.body`)}</p>
            <p className="text-sm font-bold mt-4 border-l-2 border-gold pl-3">{t(`journey.lessons.${lesson.id}.takeaway`)}</p>
            <div className="flex flex-wrap gap-3 mt-auto pt-5">
              <button disabled={busy} onClick={() => onToggle(lesson.id)} aria-pressed={completed} className="btn btn-ghost text-xs disabled:opacity-60">{t(completed ? 'journey.learn.undo' : 'journey.learn.mark')}</button>
              <Link to={lesson.route} className="inline-flex items-center gap-1 text-xs font-black text-ocean dark:text-sky">{t('journey.learn.action')}<ArrowUpRight size={14} /></Link>
            </div>
          </article>;
        })}
      </div>
      <a href="https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/toolkit/" target="_blank" rel="noopener noreferrer" className="text-sm text-ocean dark:text-sky underline underline-offset-4">{t('journey.learn.resource')} · CFPB</a>
    </section>
  );
}
