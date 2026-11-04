import { apiCall } from '../services/finance.service';

// Carries out a Binth proposal after the person tapped "Confirmar". Used by the
// chat and by the "Hoje" card, so both write the same way. Money moves go through
// the app's normal actions (with the request id, so a second tap never records
// twice); plans, reminders and memory go to the advisor endpoints.
//
// Returns 'done', 'queued' (offline, will sync) or 'already_done'.
export async function runProposal(action, { dispatch, state, requestId }) {
  const p = action?.payload || {};
  const expenseAccount = state?.settings?.default_expense_account_id || null;
  const headers = requestId ? { 'Idempotency-Key': requestId } : {};
  const today = new Date().toISOString().slice(0, 10);
  let outcome;
  switch (action?.action) {
    case 'add_transaction': {
      const account = p.tipo === 'receita' ? state?.settings?.default_income_account_id : expenseAccount;
      outcome = await dispatch({ type: 'ADD_TRANSACTION', requestId, payload: { ...p, account_id: account || null } });
      break;
    }
    case 'pay_debt':
      outcome = await dispatch({ type: 'PAY_DEBT', requestId, payload: { debtId: p.debtId, amount: p.amount, account_id: expenseAccount, payment_date: new Date().toISOString() } });
      break;
    case 'pay_xitique':
      outcome = await dispatch({ type: 'PAY_XITIQUE', requestId, payload: { contributionId: p.contributionId, date: today, account_id: expenseAccount } });
      break;
    case 'goal_topup':
      outcome = await dispatch({ type: 'UPDATE_META', requestId, payload: { id: p.goalId, increment: p.amount, account_id: expenseAccount || undefined } });
      break;
    case 'add_goal':
      outcome = await dispatch({ type: 'ADD_META', requestId, payload: { nome: p.name, alvo: p.target, poupado: 0, prazo: p.deadline || '', mensal: p.monthly || 0, cat: 'Geral' } });
      break;
    case 'set_budget':
      await dispatch({ type: 'SET_BUDGET', payload: { category: p.category, limit: p.limit } });
      break;
    case 'save_plan':
      await apiCall('advisor/plans', 'POST', { kind: p.kind, title: String(p.title || '').slice(0, 120), data: p.data || {} }, headers);
      // A monthly plan also sets the budgets on the server: bring them in.
      if (p.kind === 'monthly') {
        await dispatch({ type: 'MERGE_BUDGETS', payload: (p.data?.envelopes || []).map(e => ({ category: e.category, limit: e.limit })) });
      }
      break;
    case 'reminder':
      await apiCall('advisor/reminders', 'POST', { date: p.date, text: p.text }, headers);
      break;
    case 'remember':
      await apiCall('advisor/memory', 'POST', { fact: p.fact }, headers);
      break;
    default:
      throw new Error('unknown_proposal');
  }
  return outcome === 'queued' ? 'queued' : outcome === 'already_done' ? 'already_done' : 'done';
}

export const ADVISOR_ACTIONS = ['add_transaction', 'pay_debt', 'pay_xitique', 'goal_topup', 'add_goal', 'set_budget', 'save_plan', 'reminder', 'remember'];

// Hides amounts when the person turned the balance off on the dashboard.
export const maskAmounts = (text, hidden) => (hidden ? String(text || '').replace(/\d[\d\s.,]*\d|\d/g, '•••') : text);
