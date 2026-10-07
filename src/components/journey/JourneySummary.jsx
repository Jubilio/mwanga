import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinance } from '../../hooks/useFinance';
import { JOURNEY_SETTING_KEY, readJourney } from '../../utils/financialJourney';

export default function JourneySummary() {
  const { t } = useTranslation();
  const { state } = useFinance();
  const journey = readJourney(state.settings?.[JOURNEY_SETTING_KEY]);
  return <section className="glass-card p-5 flex flex-wrap items-center justify-between gap-4">
    <div><h2 className="font-black text-lg">{t('journey.summary.title')}</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{journey.purpose || t('journey.summary.body')}</p><p className="text-xs font-bold mt-2">{t('journey.summary.progress', { count: journey.completedLessons.length })}</p></div>
    <Link to="/jornada" className="btn btn-primary">{t('journey.summary.cta')}</Link>
  </section>;
}
