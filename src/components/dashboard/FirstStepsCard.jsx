import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useFinance } from '../../hooks/useFinance';

const DISMISS_KEY = 'mwanga-first-steps-dismissed';

function readDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === 'true'; } catch { return false; }
}

/** Steps a new household goes through; the account step is already done on arrival. */
export function getFirstSteps(state = {}) {
  return [
    { id: 'account', done: true },
    { id: 'transaction', done: (state.transacoes || []).some(t => t.tipo === 'despesa'), to: '/transacoes', navState: { openModal: true, tipo: 'despesa' } },
    { id: 'budget', done: (state.budgets || []).length > 0, to: '/orcamento' },
    { id: 'goal', done: (state.metas || []).length > 0, to: '/metas' },
  ];
}

export default function FirstStepsCard() {
  const { t } = useTranslation();
  const { state } = useFinance();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(readDismissed);

  const steps = getFirstSteps(state);
  const doneCount = steps.filter(step => step.done).length;
  if (dismissed || doneCount === steps.length) return null;

  const next = steps.find(step => !step.done);
  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, 'true'); } catch { /* storage unavailable */ }
  };

  return (
    <section className="glass-card flex flex-col gap-4" style={{ padding: '1.25rem' }} aria-labelledby="first-steps-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="first-steps-title" className="font-black text-lg">{t('dashboard.first_steps.title')}</h2>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400" style={{ marginTop: '0.25rem' }}>
            {t('dashboard.first_steps.progress', { current: doneCount, total: steps.length })}
          </p>
        </div>
        <button type="button" onClick={dismiss} className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:underline">
          {t('dashboard.first_steps.dismiss')}
        </button>
      </div>

      <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount}>
        <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      <ol className="flex flex-col gap-2">
        {steps.map(step => (
          <li key={step.id} className="flex items-center justify-between gap-3 text-sm">
            <span className={`flex items-center gap-2 ${step.done ? 'text-gray-500 dark:text-gray-400 line-through' : 'font-semibold'}`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${step.done ? 'bg-leaf text-white' : 'border border-gray-400'}`}>
                {step.done && <Check size={12} strokeWidth={3} />}
              </span>
              {t(`dashboard.first_steps.steps.${step.id}.label`)}
            </span>
            {step === next && (
              <button type="button" className="btn btn-primary shrink-0" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', width: 'auto' }} onClick={() => navigate(step.to, step.navState ? { state: step.navState } : undefined)}>
                {t(`dashboard.first_steps.steps.${step.id}.cta`)}
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
