import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { contributionScenarios } from '../../utils/financialJourney';
import { fmt } from '../../utils/calculations';

export default function JourneyScenarios({ saved, contribution }) {
  const { t } = useTranslation();
  const [months, setMonths] = useState(12);
  const [rate, setRate] = useState(0);
  const scenarios = contributionScenarios(saved, contribution, months, rate);
  return (
    <section className="glass-card p-5 sm:p-7 space-y-4">
      <h2 className="text-xl font-black">{t('journey.scenarios.title')}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">{t('journey.scenarios.body')}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label htmlFor="journey-horizon" className="text-sm font-bold">{t('journey.scenarios.months')}
          <input id="journey-horizon" type="number" min="1" max="360" step="1" className="form-input w-full mt-2" value={months} onChange={event => setMonths(event.target.value)} />
        </label>
        <label htmlFor="journey-return" className="text-sm font-bold">{t('journey.scenarios.rate')}
          <input id="journey-return" type="number" min="-99" max="100" step="0.1" className="form-input w-full mt-2" value={rate} onChange={event => setRate(event.target.value)} />
        </label>
      </div>
      <p className="text-xs font-bold">{t('journey.scenarios.assumptions', { months: scenarios[0].months, rate: scenarios[0].annualRate })}</p>
      <div className="grid gap-3 lg:grid-cols-3">
        {scenarios.map(scenario => <div key={scenario.id} className={`rounded-2xl p-4 ${scenario.id === 'planned' ? 'bg-ocean/10 dark:bg-aurora/10 border border-ocean/20' : 'bg-black/5 dark:bg-white/5'}`}>
          <h3 className="font-black text-sm">{t(`journey.scenarios.${scenario.id}`)}</h3>
          <p className="text-xs mt-2">{t('journey.scenarios.monthly')}: {fmt(scenario.contribution, 'MT')}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-5">{t('journey.scenarios.balance')}</p>
          <p className="text-xl font-black mt-1 break-words">{fmt(scenario.balance, 'MT')}</p>
          <p className="text-xs mt-3">{t('journey.scenarios.contributed')}: {fmt(scenario.contributed, 'MT')}</p>
          <p className="text-xs mt-2">{t('journey.scenarios.growth')}: {fmt(scenario.growth, 'MT')}</p>
        </div>)}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{t('journey.scenarios.note')}</p>
      <Link to="/time-machine" className="text-sm font-bold text-ocean dark:text-sky underline underline-offset-4">{t('journey.scenarios.open')}</Link>
    </section>
  );
}
