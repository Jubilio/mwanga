jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() }));
const { db } = require('../config/db');
const actions = require('../services/binthActions');

beforeEach(() => jest.clearAllMocks());

test('reads amounts the way people type them', () => {
  expect(actions.parseAmount('1.500')).toBe(1500);
  expect(actions.parseAmount('1.500,50')).toBe(1500.5);
  expect(actions.parseAmount('1 200')).toBe(1200);
  expect(actions.parseAmount(250)).toBe(250);
});

test('"gastei 500 no chapa" becomes a transport expense waiting for confirmation', () => {
  const p = actions.detectQuickTransaction('gastei 500 no chapa');
  expect(p.action).toBe('add_transaction');
  expect(p.payload).toMatchObject({ tipo: 'despesa', valor: 500, desc: 'Chapa', cat: 'transport' });
  expect(actions.detectQuickTransaction('recebi 15.000 de salário').payload).toMatchObject({ tipo: 'receita', valor: 15000, cat: 'salary' });
  expect(actions.detectQuickTransaction('como estão as minhas dívidas?')).toBeNull();
});

test('rejects zero, negative or absurd amounts and future dates', () => {
  expect(actions.proposeTransaction({ type: 'despesa', amount: 0, description: 'x' }).success).toBe(false);
  expect(actions.proposeTransaction({ type: 'despesa', amount: -5, description: 'x' }).success).toBe(false);
  expect(actions.proposeTransaction({ type: 'despesa', amount: 1e12, description: 'x' }).success).toBe(false);
  const ok = actions.proposeTransaction({ type: 'despesa', amount: 100, description: 'Pão', date: '2099-01-01' });
  expect(ok.proposal.payload.data).toBe(new Date().toISOString().slice(0, 10));
});

test('a debt payment never exceeds what is left and only matches one creditor', async () => {
  db.execute.mockResolvedValue({ rows: [{ id: 4, creditor_name: 'Banco X', remaining_amount: 800, monthly_payment: 1000 }, { id: 5, creditor_name: 'Tio João', remaining_amount: 300 }] });
  const p = await actions.proposeDebtPayment({ householdId: 7, creditor: 'banco' });
  expect(p.proposal.payload).toEqual({ debtId: 4, amount: 800 });
  expect(p.proposal.remainingAfter).toBe(0);
  const none = await actions.proposeDebtPayment({ householdId: 7, creditor: 'loja' });
  expect(none.success).toBe(false);
  expect(none.data.pendingCreditors).toEqual(['Banco X', 'Tio João']);
  expect(db.execute.mock.calls[0][0].args).toEqual([7]);
});

test('proposals never write to the database', async () => {
  db.execute.mockResolvedValue({ rows: [{ id: 9, amount: 1000, due_date: '2026-11-15', name: 'Família' }] });
  const p = await actions.proposeXitiquePayment({ householdId: 7 });
  expect(p.proposal).toMatchObject({ action: 'pay_xitique', payload: { contributionId: 9 } });
  for (const call of db.execute.mock.calls) expect(call[0].sql).not.toMatch(/INSERT|UPDATE|DELETE/i);
  expect(actions.proposalResponse(p.proposal, 'pt').message).toContain('Família');
});
