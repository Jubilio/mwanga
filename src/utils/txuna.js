/**
 * Txuna M-Pesa: empréstimos de curto prazo do M-Pesa (Access Bank / First Capital Bank).
 *
 * Regras publicadas pela Vodacom (vm.co.mz/m-pesa/artigo/txuna-m-pesa):
 *  - prazos de 7, 14 ou 30 dias, com taxa de serviço única de 10%, 12% ou 15%;
 *  - o valor é creditado na conta M-Pesa e o reembolso sai da mesma conta;
 *  - pode pagar-se de uma vez ou em prestações, desde que dentro do prazo;
 *  - em atraso, o banco pode baixar o limite, suspender novos empréstimos e
 *    reportar à Central de Risco de Crédito do Banco de Moçambique.
 *
 * Na base de dados um Txuna é uma dívida normal: credor "Txuna M-Pesa",
 * interest_period "term" (a taxa é única para todo o prazo, não ao mês),
 * interest_rate = taxa (0.10, 0.12, 0.15) e due_date = data limite.
 */
import { parseAmount } from './smsParser';

export const TXUNA_CREDITOR = 'Txuna M-Pesa';
export const TXUNA_PERIOD = 'term';

export const TXUNA_TERMS = [
  { days: 7, fee: 0.10 },
  { days: 14, fee: 0.12 },
  { days: 30, fee: 0.15 },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (n) => Math.round(Number(n) * 100) / 100;

function toDay(value) {
  const s = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function addDays(day, n) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function localToday(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function termForDays(days) {
  return TXUNA_TERMS.find((t) => t.days === Number(days)) || null;
}

export function termForFee(fee) {
  const f = Number(fee);
  return TXUNA_TERMS.find((t) => Math.abs(t.fee - f) < 0.005) || null;
}

/** Valor pedido + prazo + dia do empréstimo → taxa, total a pagar e data limite. */
export function computeTxunaLoan(principal, days, loanDate) {
  const term = termForDays(days);
  const amount = Number(principal);
  const start = toDay(loanDate);
  if (!term || !(amount > 0) || !start) return null;
  const fee = round2(amount * term.fee);
  return {
    principal: round2(amount),
    days: term.days,
    feeRate: term.fee,
    fee,
    total: round2(amount + fee),
    loanDate: start,
    dueDate: addDays(start, term.days),
  };
}

/** Payload para ADD_DEBT / POST /debts. */
export function buildTxunaDebt(loan, accountId = null) {
  return {
    creditor_name: TXUNA_CREDITOR,
    principal_amount: loan.principal,
    interest_rate: loan.feeRate,
    interest_period: TXUNA_PERIOD,
    months_duration: 0,
    monthly_payment: 0,
    total_amount: loan.total,
    remaining_amount: loan.total,
    due_date: loan.dueDate,
    account_id: accountId || null,
    status: 'pending',
  };
}

export function isTxunaDebt(debt) {
  return Boolean(debt) && (/txuna/i.test(String(debt.creditor_name || '')) || debt.interest_period === TXUNA_PERIOD);
}

/** Prazo em dias de uma dívida Txuna gravada (pela taxa; 30 se não der para saber). */
export function txunaTermDays(debt) {
  return termForFee(debt?.interest_rate)?.days || 30;
}

/**
 * Situação de um Txuna em aberto num dado dia:
 *  level 'paid' | 'ok' | 'soon' (≤ 2 dias) | 'today' | 'overdue'.
 */
export function txunaStatus(debt, today = localToday()) {
  if (!debt || debt.status === 'paid' || Number(debt.remaining_amount) <= 0) {
    return { level: 'paid', daysLeft: null };
  }
  const due = toDay(debt.due_date);
  if (!due) return { level: 'ok', daysLeft: null };
  const daysLeft = daysBetween(today, due);
  let level = 'ok';
  if (daysLeft < 0) level = 'overdue';
  else if (daysLeft === 0) level = 'today';
  else if (daysLeft <= 2) level = 'soon';
  return { level, daysLeft, dueDate: due };
}

/** O Txuna em aberto que um reembolso deve abater: o que vence primeiro. */
export function pickTxunaDebtForRepayment(debts = []) {
  return debts
    .filter((d) => isTxunaDebt(d) && d.status !== 'paid' && Number(d.remaining_amount) > 0)
    .sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')))[0] || null;
}

// ---------- SMS ----------

const MONEY = /([\d][\d.,]*)\s*(?:MT|MZN)\b/gi;
const DATE = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/;

function smsDate(fragment) {
  const m = String(fragment || '').match(DATE);
  if (!m) return null;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function amountAfter(text, keywords) {
  const re = new RegExp(`(?:${keywords})[^\\d]{0,40}?([\\d][\\d.,]*)\\s*(?:MT|MZN)\\b`, 'i');
  const m = text.match(re);
  return m ? parseAmount(m[1]) : null;
}

/**
 * Lê um SMS do Txuna M-Pesa. Devolve null se não for Txuna.
 *  kind 'loan': empréstimo recebido (principal, total, dueDate, days quando o SMS os diz)
 *  kind 'repayment': pagamento (amount, remaining quando o SMS o diz)
 * O formato exacto varia, por isso lê palavras-chave e não uma frase fixa.
 */
export function parseTxunaSms(input) {
  const text = String(input || '').replace(/\s+/g, ' ').trim();
  if (!/txuna/i.test(text)) return null;

  const amounts = [...text.matchAll(MONEY)].map((m) => parseAmount(m[1])).filter((n) => Number.isFinite(n) && n > 0);
  if (amounts.length === 0) return null;

  const transactionId = (text.match(/^([A-Z0-9]{8,14})\s+confirmad[oa]/) || text.match(/ID\s*Trans[:\s]+([A-Za-z0-9.]*[A-Za-z0-9])/i) || [])[1] || null;
  const dueFragment = text.match(/(?:at[eé]|vence|prazo|data limite|limite)[^\d]{0,25}(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  const dueDate = dueFragment ? smsDate(dueFragment[1]) : null;
  const firstDate = smsDate(dueFragment ? text.replace(dueFragment[0], '') : text);
  const termMatch = text.match(/\b(7|14|30)\s*dias\b/i);

  const lower = text.toLowerCase();
  const loanWords = /recebeste|recebeu|creditad|concedid|aprovad|desembols|foi transferid/.test(lower);
  const payWords = /pagaste|pagou|pagamento|reembols|liquidad|liquidaste|amortiz/.test(lower);
  const kind = loanWords ? 'loan' : payWords ? 'repayment' : /empr[eé]stimo|pediste|solicitaste/.test(lower) ? 'loan' : null;
  if (!kind) return null;

  if (kind === 'repayment') {
    const amount = amountAfter(text, 'pagaste|pagou|pagamento de|reembolso de|reembolsaste|valor de') ?? amounts[0];
    const remaining = amountAfter(text, 'em d[ií]vida|por pagar|falta(?:m)?|saldo do empr[eé]stimo|valor em falta|remanescente');
    const settled = /liquidad|totalmente pago|pago na totalidade/.test(lower) || remaining === 0;
    return { kind, amount, remaining: remaining ?? (settled ? 0 : null), date: firstDate, transactionId };
  }

  const principal = amountAfter(text, 'empr[eé]stimo de|recebeste|recebeu|creditad[oa]s?(?: com)?|valor de|montante de') ?? amounts[0];
  const total = amountAfter(text, 'total(?: a pagar| a reembolsar)?|a pagar|a reembolsar|devolver|deves pagar|reembolsar');
  let term = termMatch ? termForDays(termMatch[1]) : null;
  if (!term && total && principal && total > principal) term = termForFee(round2((total - principal) / principal));
  if (!term && dueDate && firstDate) {
    const span = daysBetween(firstDate, dueDate);
    term = TXUNA_TERMS.reduce((best, t) => (Math.abs(t.days - span) < Math.abs(best.days - span) ? t : best), TXUNA_TERMS[0]);
  }
  return {
    kind,
    principal,
    total: total && total > principal ? total : null,
    days: term?.days || null,
    loanDate: firstDate,
    dueDate,
    transactionId,
  };
}

/** SMS de empréstimo → empréstimo completo (usa o que o SMS diz, calcula o resto). */
export function loanFromSms(parsed, fallbackDays = 30, today = localToday()) {
  if (!parsed || parsed.kind !== 'loan') return null;
  const loanDate = parsed.loanDate || (parsed.dueDate && parsed.days ? addDays(parsed.dueDate, -parsed.days) : today);
  const loan = computeTxunaLoan(parsed.principal, parsed.days || fallbackDays, loanDate);
  if (!loan) return null;
  if (parsed.total) {
    loan.total = round2(parsed.total);
    loan.fee = round2(parsed.total - loan.principal);
  }
  if (parsed.dueDate) loan.dueDate = parsed.dueDate;
  return loan;
}

/**
 * O que fazer com um SMS do Txuna, dadas as dívidas já registadas:
 *  { type: 'add_debt', body }           novo empréstimo → POST /debts
 *  { type: 'pay_debt', debtId, body }   reembolso → POST /debts/:id/pay
 *  { type: 'skip' }                     já registado, ou reembolso sem Txuna em aberto
 * Devolve null quando o SMS não é Txuna.
 */
export function planTxunaSmsAction(smsText, { debts = [], smsDay = localToday(), accountId = null } = {}) {
  const parsed = parseTxunaSms(smsText);
  if (!parsed) return null;

  if (parsed.kind === 'loan') {
    const loan = loanFromSms({ ...parsed, loanDate: parsed.loanDate || smsDay }, 30, smsDay);
    if (!loan) return { type: 'skip' };
    const already = debts.some((d) => isTxunaDebt(d)
      && Math.abs(Number(d.principal_amount || 0) - loan.principal) < 0.01
      && Math.abs(daysBetween(String(d.due_date || loan.dueDate).slice(0, 10), loan.dueDate)) <= 1);
    if (already) return { type: 'skip' };
    return {
      type: 'add_debt',
      loan,
      // Sem prazo no SMS assumimos 30 dias; a pessoa pode corrigir nas Dívidas.
      assumedTerm: !parsed.days,
      body: { ...buildTxunaDebt(loan, accountId), start_date: loan.loanDate },
    };
  }

  const debt = pickTxunaDebtForRepayment(debts);
  const amount = Number(parsed.amount);
  if (!debt || !(amount > 0)) return { type: 'skip' };
  const day = parsed.date || smsDay;
  const already = (debt.payments || []).some((p) => Math.abs(Number(p.amount) - amount) < 0.01 && String(p.payment_date || '').slice(0, 10) === day);
  if (already) return { type: 'skip' };
  return {
    type: 'pay_debt',
    debtId: debt.id,
    body: { amount: Math.min(amount, Number(debt.remaining_amount)), payment_date: day, account_id: accountId || null },
  };
}
