import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { PRIORITIES, dayKey } from '../../utils/financialJourney';

const inputClass = 'form-input w-full mt-2';

export default function PlanEditor({ journey, goals, busy, onSave, onCancel, reloadData }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => ({ ...journey, goalId: goals.some(goal => String(goal.id) === String(journey.goalId)) ? journey.goalId : null }));
  const [creating, setCreating] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', target: '', deadline: '' });
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalNotice, setGoalNotice] = useState('');
  const [createdGoal, setCreatedGoal] = useState(null);
  const [error, setError] = useState('');
  const choices = createdGoal && !goals.some(goal => String(goal.id) === String(createdGoal.id))
    ? [...goals, createdGoal] : goals;
  const change = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));

  async function createGoal(event) {
    event.preventDefault();
    if (goalBusy || busy) return;
    setGoalBusy(true);
    setGoalNotice('');
    try {
      const response = await api.post('/goals', {
        name: newGoal.name.trim(), targetAmount: Number(newGoal.target), savedAmount: 0,
        deadline: newGoal.deadline, category: draft.priority === 'investment' ? 'investments' : 'savings',
        monthlySaving: Number(draft.monthlyContribution),
      });
      const id = Number(response.data.id);
      if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Missing goal ID');
      setCreatedGoal({ id, nome: newGoal.name.trim(), alvo: Number(newGoal.target), poupado: 0, prazo: newGoal.deadline });
      change('goalId', id);
      setCreating(false);
      setGoalNotice('goal_created');
      // Creation has succeeded already. A refresh failure must not offer a
      // second create request, which could duplicate the goal.
      await reloadData().catch(() => {});
    } catch { setGoalNotice('goal_error'); }
    finally { setGoalBusy(false); }
  }

  async function savePlan(event) {
    event.preventDefault();
    if (!draft.purpose.trim()) { setError(t('journey.plan.purpose_required')); return; }
    setError('');
    await onSave({ ...draft, purpose: draft.purpose.trim() });
  }

  return (
    <section className="glass-card p-5 sm:p-7">
      <h2 className="text-xl font-black mb-5">{t('journey.plan.title')}</h2>
      <form onSubmit={savePlan} className="space-y-5">
        <fieldset disabled={busy || goalBusy} className="space-y-5 disabled:opacity-60">
          <label className="block text-sm font-bold" htmlFor="journey-purpose">
            {t('journey.plan.purpose')}
            <textarea id="journey-purpose" required maxLength={200} rows={3} className={inputClass}
              value={draft.purpose} placeholder={t('journey.plan.purpose_placeholder')}
              onChange={event => change('purpose', event.target.value)} />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-bold" htmlFor="journey-priority">
              {t('journey.plan.priority')}
              <select id="journey-priority" className={inputClass} value={draft.priority} onChange={event => change('priority', event.target.value)}>
                {PRIORITIES.map(priority => <option key={priority} value={priority}>{t(`journey.priorities.${priority}`)}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold" htmlFor="journey-monthly">
              {t('journey.plan.monthly')}
              <input id="journey-monthly" type="number" min="0" max="1000000000000" step="0.01" required className={inputClass}
                value={draft.monthlyContribution} onChange={event => change('monthlyContribution', event.target.value === '' ? '' : Number(event.target.value))} />
            </label>
          </div>
          <label className="block text-sm font-bold" htmlFor="journey-goal">
            {t('journey.plan.goal')}
            <select id="journey-goal" className={inputClass} value={draft.goalId || ''} onChange={event => change('goalId', event.target.value ? Number(event.target.value) : null)}>
              <option value="">{t('journey.plan.none')}</option>
              {choices.map(goal => <option key={goal.id} value={goal.id}>{goal.nome}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setCreating(!creating)} aria-expanded={creating} className="text-sm font-bold text-ocean dark:text-sky underline underline-offset-4">
            {t('journey.plan.new_goal')}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('journey.plan.plan_not_transfer')}</p>
          {error ? <p role="alert" className="text-sm text-coral">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={creating} className="btn btn-primary disabled:opacity-60">{busy ? t('journey.saving') : t('journey.save')}</button>
            {onCancel ? <button type="button" onClick={onCancel} className="btn btn-ghost">{t('journey.cancel')}</button> : null}
          </div>
        </fieldset>
      </form>
      {creating ? (
        <form onSubmit={createGoal} className="mt-6 border-t border-black/10 dark:border-white/10 pt-6 space-y-4">
          <fieldset disabled={busy || goalBusy} className="space-y-4 disabled:opacity-60">
            <h3 className="font-black">{t('journey.plan.new_goal')}</h3>
            <label className="block text-sm font-bold" htmlFor="journey-goal-name">{t('journey.plan.name')}
              <input id="journey-goal-name" required maxLength={100} className={inputClass} value={newGoal.name} onChange={event => setNewGoal({ ...newGoal, name: event.target.value })} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold" htmlFor="journey-goal-target">{t('journey.plan.target')}
                <input id="journey-goal-target" type="number" min="0.01" max="1000000000000" step="0.01" required className={inputClass} value={newGoal.target} onChange={event => setNewGoal({ ...newGoal, target: event.target.value })} />
              </label>
              <label className="block text-sm font-bold" htmlFor="journey-goal-deadline">{t('journey.plan.deadline')}
                <input id="journey-goal-deadline" type="date" min={dayKey()} required className={inputClass} value={newGoal.deadline} onChange={event => setNewGoal({ ...newGoal, deadline: event.target.value })} />
              </label>
            </div>
            <button type="submit" className="btn btn-primary">{goalBusy ? t('journey.saving') : t('journey.plan.create_goal')}</button>
          </fieldset>
        </form>
      ) : null}
      {goalNotice ? <p role={goalNotice === 'goal_error' ? 'alert' : 'status'} className={`text-sm mt-4 ${goalNotice === 'goal_error' ? 'text-coral' : 'text-emerald-600 dark:text-aurora'}`}>{t(`journey.plan.${goalNotice}`)}</p> : null}
    </section>
  );
}
