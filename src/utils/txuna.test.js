import { describe, expect, it } from 'vitest';
import {
  buildTxunaDebt, computeTxunaLoan, isTxunaDebt, loanFromSms, parseTxunaSms,
  pickTxunaDebtForRepayment, planTxunaSmsAction, txunaStatus, txunaTermDays,
} from './txuna';

describe('computeTxunaLoan', () => {
  it('applies the published fee for each term', () => {
    expect(computeTxunaLoan(1000, 7, '2026-11-10')).toMatchObject({ fee: 100, total: 1100, dueDate: '2026-11-17' });
    expect(computeTxunaLoan(1000, 14, '2026-11-10')).toMatchObject({ fee: 120, total: 1120, dueDate: '2026-11-24' });
    expect(computeTxunaLoan(1000, 30, '2026-11-10')).toMatchObject({ fee: 150, total: 1150, dueDate: '2026-12-10' });
  });

  it('rejects terms Txuna does not offer and bad input', () => {
    expect(computeTxunaLoan(1000, 10, '2026-11-10')).toBeNull();
    expect(computeTxunaLoan(0, 7, '2026-11-10')).toBeNull();
    expect(computeTxunaLoan(1000, 7, '')).toBeNull();
  });

  it('rounds the fee to cents', () => {
    expect(computeTxunaLoan(333.33, 14, '2026-11-10')).toMatchObject({ fee: 40, total: 373.33 });
  });
});

describe('debt shape', () => {
  const debt = buildTxunaDebt(computeTxunaLoan(2000, 14, '2026-11-10'), 5);

  it('stores the fee as a one-off term rate', () => {
    expect(debt).toMatchObject({
      creditor_name: 'Txuna M-Pesa', principal_amount: 2000, total_amount: 2240, remaining_amount: 2240,
      interest_rate: 0.12, interest_period: 'term', due_date: '2026-11-24', account_id: 5,
    });
    expect(isTxunaDebt(debt)).toBe(true);
    expect(txunaTermDays(debt)).toBe(14);
    expect(isTxunaDebt({ creditor_name: 'Banco BCI', interest_period: 'monthly' })).toBe(false);
  });

  it('reports how close the due date is', () => {
    expect(txunaStatus(debt, '2026-11-11')).toMatchObject({ level: 'ok', daysLeft: 13 });
    expect(txunaStatus(debt, '2026-11-22')).toMatchObject({ level: 'soon', daysLeft: 2 });
    expect(txunaStatus(debt, '2026-11-24')).toMatchObject({ level: 'today', daysLeft: 0 });
    expect(txunaStatus(debt, '2026-11-27')).toMatchObject({ level: 'overdue', daysLeft: -3 });
    expect(txunaStatus({ ...debt, status: 'paid', remaining_amount: 0 }, '2026-11-27').level).toBe('paid');
  });
});

// The exact Vodacom wording is not published; these follow the usual M-Pesa SMS shape.
describe('parseTxunaSms', () => {
  it('ignores SMS that are not about Txuna', () => {
    expect(parseTxunaSms('DJV2M5U6H4I confirmado. Compraste 3.25GB atraves do M-Pesa no valor de 100.00MT.')).toBeNull();
    expect(parseTxunaSms('Txuna M-Pesa: ja podes pedir o teu emprestimo no *150#.')).toBeNull();
  });

  it('reads a loan with total, term and due date', () => {
    const sms = 'DKA5XY12ABC confirmado. Recebeste 1,000.00MT do Txuna M-Pesa no dia 10/11/26 as 3:12 PM. Prazo de 14 dias. Total a pagar 1,120.00MT ate 24/11/2026. O novo saldo M-Pesa e de 1,050.00MT.';
    expect(parseTxunaSms(sms)).toMatchObject({ kind: 'loan', principal: 1000, total: 1120, days: 14, loanDate: '2026-11-10', dueDate: '2026-11-24', transactionId: 'DKA5XY12ABC' });
  });

  it('works out the term from the total when the SMS does not say it', () => {
    const parsed = parseTxunaSms('O teu emprestimo Txuna de 500.00MT foi aprovado. Total a reembolsar: 550.00MT.');
    expect(parsed).toMatchObject({ kind: 'loan', principal: 500, total: 550, days: 7 });
    expect(loanFromSms(parsed, 30, '2026-11-10')).toMatchObject({ total: 550, dueDate: '2026-11-17' });
  });

  it('reads a repayment and what is left', () => {
    const sms = 'DKB7QQ90XYZ confirmado. Pagaste 400.00MT do teu emprestimo Txuna M-Pesa no dia 12/11/26. Valor em divida: 720.00MT.';
    expect(parseTxunaSms(sms)).toMatchObject({ kind: 'repayment', amount: 400, remaining: 720, date: '2026-11-12' });
  });
});

// Real SMS from 2026-11-10 (Access Bank Txuna loan); it never says "Txuna".
const REAL_LOAN_SMS = 'Confirmado DKA1M9YZ4FH. Recebeste  3,335.00MT de 902114 - Access Bank aos 10/11/26  as 10:09 AM o novo saldo  M-Pesa e de 3,335.28MT. Aproveita e transfere SEM TAXAS de M-Pesa para M-Pesa. Em caso de duvida, liga 100.';

describe('real Txuna SMS', () => {
  it('reads the Access Bank loan SMS', () => {
    expect(parseTxunaSms(REAL_LOAN_SMS)).toMatchObject({
      kind: 'loan', principal: 3335, total: null, days: null, loanDate: '2026-11-10', dueDate: null, transactionId: 'DKA1M9YZ4FH',
    });
  });

  it('uses the term the person picks, since the SMS does not give it', () => {
    const plan = planTxunaSmsAction(REAL_LOAN_SMS, { days: 14 });
    expect(plan).toMatchObject({ type: 'add_debt', assumedTerm: false });
    expect(plan.body).toMatchObject({ principal_amount: 3335, total_amount: 3735.2, interest_rate: 0.12, due_date: '2026-11-24', start_date: '2026-11-10' });
    expect(planTxunaSmsAction(REAL_LOAN_SMS).body).toMatchObject({ total_amount: 3835.25, due_date: '2026-12-10' });
  });

  it('treats money sent to the bank short code as a repayment', () => {
    const sms = 'Confirmado DKC2AB34CDE. Transferiste 1,000.00MT para 902114 - Access Bank aos 15/11/26 as 9:00 AM o novo saldo M-Pesa e de 500.00MT.';
    expect(parseTxunaSms(sms)).toMatchObject({ kind: 'repayment', amount: 1000, date: '2026-11-15', transactionId: 'DKC2AB34CDE' });
  });

  it('leaves ordinary M-Pesa transfers alone', () => {
    expect(parseTxunaSms('Confirmado DKA1M9YZ4FH. Recebeste 500.00MT de 841234567 - ANA COSSA aos 10/11/26 as 10:09 AM.')).toBeNull();
  });
});

describe('planTxunaSmsAction', () => {
  const loanSms = 'DKA5XY12ABC confirmado. Recebeste 1,000.00MT do Txuna M-Pesa no dia 10/11/26. Prazo de 14 dias. Total a pagar 1,120.00MT ate 24/11/2026.';
  const paySms = 'DKB7QQ90XYZ confirmado. Pagaste 400.00MT do teu emprestimo Txuna M-Pesa no dia 12/11/26.';
  const existing = { id: 9, ...buildTxunaDebt(computeTxunaLoan(1000, 14, '2026-11-10')), payments: [] };

  it('returns null for other SMS', () => {
    expect(planTxunaSmsAction('Recebeu 500.00MT de 841234567')).toBeNull();
  });

  it('creates the debt once', () => {
    const plan = planTxunaSmsAction(loanSms, { debts: [], accountId: 3 });
    expect(plan.type).toBe('add_debt');
    expect(plan.body).toMatchObject({ total_amount: 1120, due_date: '2026-11-24', account_id: 3, start_date: '2026-11-10' });
    expect(planTxunaSmsAction(loanSms, { debts: [existing] })).toEqual({ type: 'skip' });
  });

  it('assumes 30 days when the SMS gives no term', () => {
    const plan = planTxunaSmsAction('Recebeste 1,000.00MT do Txuna M-Pesa.', { smsDay: '2026-11-10' });
    expect(plan).toMatchObject({ type: 'add_debt', assumedTerm: true });
    expect(plan.body).toMatchObject({ total_amount: 1150, due_date: '2026-12-10' });
  });

  it('applies a repayment to the open Txuna that is due first', () => {
    const later = { ...existing, id: 10, due_date: '2026-12-01' };
    expect(pickTxunaDebtForRepayment([later, existing]).id).toBe(9);
    expect(planTxunaSmsAction(paySms, { debts: [later, existing], accountId: 3 })).toEqual({
      type: 'pay_debt', debtId: 9, body: { amount: 400, payment_date: '2026-11-12', account_id: 3 },
    });
  });

  it('never pays more than what is left, twice, or without an open Txuna', () => {
    expect(planTxunaSmsAction(paySms, { debts: [{ ...existing, remaining_amount: 150 }] }).body.amount).toBe(150);
    const paid = { ...existing, payments: [{ amount: 400, payment_date: '2026-11-12T00:00:00.000Z' }] };
    expect(planTxunaSmsAction(paySms, { debts: [paid] })).toEqual({ type: 'skip' });
    expect(planTxunaSmsAction(paySms, { debts: [] })).toEqual({ type: 'skip' });
  });
});
