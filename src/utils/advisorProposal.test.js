import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../services/finance.service', () => ({ apiCall: vi.fn(async () => ({})) }));
import { apiCall } from '../services/finance.service';
import { runProposal } from './advisorProposal';
import { describeRequest, QUEUEABLE_TYPES } from './offlineQueue';

const state = { settings: { default_expense_account_id: 5, default_income_account_id: 6 } };

describe('runProposal', () => {
  let dispatch;
  beforeEach(() => { vi.clearAllMocks(); dispatch = vi.fn(async () => 'saved'); });

  it('tops up a goal through the normal goal action, with the request id', async () => {
    const out = await runProposal({ action: 'goal_topup', payload: { goalId: 3, amount: 2000 } }, { dispatch, state, requestId: 'binth-goal-1' });
    expect(out).toBe('done');
    expect(dispatch).toHaveBeenCalledWith({ type: 'UPDATE_META', requestId: 'binth-goal-1', payload: { id: 3, increment: 2000, account_id: 5 } });
  });

  it('creates a goal that is saved on the server', async () => {
    await runProposal({ action: 'add_goal', payload: { name: 'Escola', target: 20000, deadline: '2027-01-31', monthly: 4000 } }, { dispatch, state });
    expect(dispatch.mock.calls[0][0]).toMatchObject({ type: 'ADD_META', payload: { nome: 'Escola', alvo: 20000, prazo: '2027-01-31', mensal: 4000 } });
    expect(describeRequest('ADD_META', { name: 'Escola' })).toEqual({ endpoint: 'goals', method: 'POST', body: { name: 'Escola' } });
    expect(QUEUEABLE_TYPES).toContain('ADD_META');
  });

  it('saves a monthly plan with an idempotency key and shows its budgets', async () => {
    const envelopes = [{ category: 'food', limit: 4000 }];
    await runProposal({ action: 'save_plan', payload: { kind: 'monthly', title: 'Plano', data: { envelopes } } }, { dispatch, state, requestId: 'plan-monthly-1' });
    expect(apiCall).toHaveBeenCalledWith('advisor/plans', 'POST', { kind: 'monthly', title: 'Plano', data: { envelopes } }, { 'Idempotency-Key': 'plan-monthly-1' });
    expect(dispatch).toHaveBeenCalledWith({ type: 'MERGE_BUDGETS', payload: [{ category: 'food', limit: 4000 }] });
  });

  it('reminders and memory go to the advisor endpoints', async () => {
    await runProposal({ action: 'reminder', payload: { date: '2026-12-05', text: 'Escola' } }, { dispatch, state });
    await runProposal({ action: 'remember', payload: { fact: 'Recebe a 25' } }, { dispatch, state });
    expect(apiCall).toHaveBeenCalledWith('advisor/reminders', 'POST', { date: '2026-12-05', text: 'Escola' }, {});
    expect(apiCall).toHaveBeenCalledWith('advisor/memory', 'POST', { fact: 'Recebe a 25' }, {});
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('reports queued and already done, and refuses unknown actions', async () => {
    dispatch.mockResolvedValueOnce('queued');
    expect(await runProposal({ action: 'pay_xitique', payload: { contributionId: 1 } }, { dispatch, state })).toBe('queued');
    dispatch.mockResolvedValueOnce('already_done');
    expect(await runProposal({ action: 'pay_debt', payload: { debtId: 1, amount: 10 } }, { dispatch, state })).toBe('already_done');
    await expect(runProposal({ action: 'transfer_all', payload: {} }, { dispatch, state })).rejects.toThrow();
  });
});
