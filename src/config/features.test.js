import { describe, expect, it } from 'vitest';
import { getEffectiveTier, getTrialStatus, hasFeatureAccess } from './features';
import { getFirstSteps } from '../components/dashboard/FirstStepsCard';

const now = new Date('2026-10-30T12:00:00Z');
const daysFromNow = days => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

describe('plans', () => {
  it('gives xitique to every plan and keeps simulators on Património (pro)', () => {
    expect(hasFeatureAccess('free', 'xitique')).toBe(true);
    expect(hasFeatureAccess('growth', 'patrimonio')).toBe(true);
    expect(hasFeatureAccess('growth', 'simuladores')).toBe(false);
    expect(hasFeatureAccess('pro', 'simuladores')).toBe(true);
    expect(hasFeatureAccess('legacy', 'anything')).toBe(true);
  });
});

describe('trial', () => {
  it('offers the trial only to free accounts older than 30 days that never used it', () => {
    expect(getTrialStatus({ subscription_tier: 'free' }, daysFromNow(-31), now).eligible).toBe(true);
    expect(getTrialStatus({ subscription_tier: 'free' }, daysFromNow(-10), now).eligible).toBe(false);
    expect(getTrialStatus({ subscription_tier: 'growth' }, daysFromNow(-90), now).eligible).toBe(false);
    expect(getTrialStatus({ subscription_tier: 'free', trial_ends_at: daysFromNow(-1) }, daysFromNow(-90), now).eligible).toBe(false);
  });

  it('counts days left and warns in the last three days', () => {
    const running = getTrialStatus({ trial_ends_at: daysFromNow(10) }, null, now);
    expect(running).toMatchObject({ active: true, daysLeft: 10, endingSoon: false });
    expect(getTrialStatus({ trial_ends_at: daysFromNow(2.5) }, null, now)).toMatchObject({ active: true, daysLeft: 3, endingSoon: true });
  });

  it('upgrades the effective tier only while the trial runs', () => {
    expect(getEffectiveTier({ subscription_tier: 'free', trial_ends_at: daysFromNow(5) }, now)).toBe('growth');
    expect(getEffectiveTier({ subscription_tier: 'free', trial_ends_at: daysFromNow(-1) }, now)).toBe('free');
    expect(getEffectiveTier({ subscription_tier: 'pro', trial_ends_at: daysFromNow(5) }, now)).toBe('pro');
  });
});

describe('first steps', () => {
  it('starts with the account step done and tracks expense, budget and goal', () => {
    expect(getFirstSteps({}).map(step => step.done)).toEqual([true, false, false, false]);
    const state = { transacoes: [{ tipo: 'despesa' }], budgets: [{ id: 1 }], metas: [] };
    expect(getFirstSteps(state).map(step => step.done)).toEqual([true, true, true, false]);
    expect(getFirstSteps({ transacoes: [{ tipo: 'receita' }] })[1].done).toBe(false);
  });
});
