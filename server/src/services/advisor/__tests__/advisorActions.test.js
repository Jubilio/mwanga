jest.mock('../../../config/db', () => ({ db: { execute: jest.fn(async () => ({ rows: [
  { id: 1, name: 'Escola dos filhos', target_amount: 20000, saved_amount: 5000 },
  { id: 2, name: 'Fundo de emergência', target_amount: 30000, saved_amount: 30000 },
  { id: 3, name: 'Carro', target_amount: 200000, saved_amount: 0 },
] })) } }));

const actions = require('../advisorActions');
const rules = require('../advisorRules');
const { proposalResponse } = require('../../binthActions');

const today = rules.todayMz();

describe('advisor proposals never write and validate input', () => {
  test('budget change needs a known category and a positive limit', () => {
    expect(actions.proposeBudgetChange({ category: 'food', limit: '4.500' }).proposal).toEqual({ action: 'set_budget', payload: { category: 'food', limit: 4500 } });
    expect(actions.proposeBudgetChange({ category: 'apostas', limit: 100 }).success).toBe(false);
    expect(actions.proposeBudgetChange({ category: 'food', limit: -1 }).success).toBe(false);
  });

  test('goal with a deadline gets a monthly amount', () => {
    const deadline = rules.addDays(today, 150);
    const r = actions.proposeGoal({ name: '  Escola   2027 ', target: 20000, deadline });
    expect(r.proposal.action).toBe('add_goal');
    expect(r.proposal.payload).toMatchObject({ name: 'Escola 2027', target: 20000, deadline });
    expect(r.proposal.payload.monthly).toBe(4000);
    // A past deadline is dropped.
    expect(actions.proposeGoal({ name: 'X', target: 100, deadline: '2020-01-01' }).proposal.payload.deadline).toBeNull();
  });

  test('goal top-up matches one open goal by name', async () => {
    const ok = await actions.proposeGoalTopUp({ householdId: 3, name: 'escola', amount: 2000 });
    expect(ok.proposal).toMatchObject({ action: 'goal_topup', payload: { goalId: 1, amount: 2000 }, name: 'Escola dos filhos' });
    const done = await actions.proposeGoalTopUp({ householdId: 3, name: 'emergência', amount: 2000 });
    expect(done.success).toBe(false); // already complete
    const many = await actions.proposeGoalTopUp({ householdId: 3, amount: 2000 });
    expect(many.success).toBe(false);
    expect(many.data.goals).toEqual(['Escola dos filhos', 'Carro']);
  });

  test('reminder only from today up to a year', () => {
    expect(actions.proposeReminder({ date: rules.addDays(today, 3), text: 'Pagar escola' }).proposal).toEqual({ action: 'reminder', payload: { date: rules.addDays(today, 3), text: 'Pagar escola' } });
    expect(actions.proposeReminder({ date: rules.addDays(today, -1), text: 'x' }).success).toBe(false);
    expect(actions.proposeReminder({ date: rules.addDays(today, 400), text: 'x' }).success).toBe(false);
    expect(actions.proposeReminder({ date: 'amanhã', text: 'x' }).success).toBe(false);
    expect(actions.proposeReminder({ date: rules.addDays(today, 1), text: '   ' }).success).toBe(false);
  });

  test('remember fact is trimmed and capped', () => {
    const r = actions.proposeRememberFact({ fact: `Recebe a 25 ${'x'.repeat(300)}` });
    expect(r.proposal.payload.fact).toHaveLength(200);
    expect(actions.proposeRememberFact({ fact: '' }).success).toBe(false);
  });
});

describe('confirmation card text', () => {
  test('Binth shows the advisor card through the usual proposal response', () => {
    const res = proposalResponse({ action: 'set_budget', payload: { category: 'food', limit: 4500 } }, 'pt');
    expect(res.pending_action.action).toBe('set_budget');
    expect(res.message).toMatch(/orçamento de Alimentação/);
    expect(proposalResponse({ action: 'remember', payload: { fact: 'Recebe a 25' } }, 'en').message).toMatch(/remember this/);
  });
  test('debt plan text in both languages', () => {
    const proposal = { action: 'save_plan', payload: { kind: 'debt', title: 't', data: { monthlyPayment: 3000, months: 5, totalInterest: 200, order: [{ name: 'Tio', paidOffMonth: 1 }] } } };
    expect(actions.advisorProposalMessage(proposal, 'pt')).toMatch(/livre de dívidas em 5 meses/);
    expect(actions.advisorProposalMessage(proposal, 'en')).toMatch(/debt-free in 5 months/);
  });
});
