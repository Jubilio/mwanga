const { db } = require('../config/db');

// Actions the Binth can PROPOSE. Nothing here writes to the database: the app
// shows a confirmation card and, only when the person taps "Confirmar", calls
// the normal endpoints (POST /transactions, /debts/:id/pay, /xitiques/pay/:id).

const CATEGORIES = ['food', 'transport', 'health', 'education', 'energy_water', 'internet', 'church_donations', 'leisure', 'investments', 'savings', 'house_rent', 'habitacao', 'xitique', 'salary', 'other'];
const MAX_AMOUNT = 1e9;

const CATEGORY_HINTS = [
  [/chapa|txopela|transporte|uber|yango|táxi|taxi|combust|gasolina|bolt|machimbombo/, 'transport'],
  [/p[aã]o|mercado|comida|almo[cç]o|jantar|supermercado|shoprite|refei|lanche|mercearia/, 'food'],
  [/luz|credelec|[aá]gua|energia|edm|fipag/, 'energy_water'],
  [/recarga|megas|internet|dados|cr[eé]dito de telem/, 'internet'],
  [/farm[aá]cia|hospital|m[eé]dico|cl[ií]nica|rem[eé]dio/, 'health'],
  [/escola|propina|livro|curso|universidade/, 'education'],
  [/renda|aluguer/, 'house_rent'],
  [/igreja|d[ií]zimo|oferta|doa/, 'church_donations'],
  [/sal[aá]rio|ordenado/, 'salary'],
];

function guessCategory(text, type) {
  const lower = String(text || '').toLowerCase();
  for (const [re, cat] of CATEGORY_HINTS) if (re.test(lower)) return cat;
  return type === 'receita' ? 'other' : 'other';
}

function today() { return new Date().toISOString().slice(0, 10); }

function cleanDate(value) {
  const s = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(new Date(s).getTime())) return today();
  // No future dates, and nothing older than a year from a chat message.
  const t = new Date(s).getTime();
  if (t > Date.now() + 24 * 3600 * 1000 || t < Date.now() - 366 * 24 * 3600 * 1000) return today();
  return s;
}

function parseAmount(value) {
  if (typeof value === 'number') return value;
  // "1.500,50" or "1500.5" or "1 500"
  let s = String(value || '').replace(/\s/g, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/[.,](?=\d{3}\b)/g, '');
  return Number(s);
}

function proposeTransaction({ type, amount, description, category, date }) {
  const tipo = type === 'receita' ? 'receita' : 'despesa';
  const valor = Math.round(parseAmount(amount) * 100) / 100;
  if (!Number.isFinite(valor) || valor <= 0 || valor > MAX_AMOUNT) return { success: false, data: { error: 'Valor inválido. Pergunta ao utilizador quanto foi.' } };
  const desc = String(description || '').replace(/\s+/g, ' ').trim().slice(0, 80) || (tipo === 'receita' ? 'Entrada' : 'Despesa');
  const cat = CATEGORIES.includes(category) ? category : guessCategory(desc, tipo);
  return {
    success: true,
    proposal: { action: 'add_transaction', payload: { tipo, valor, desc, cat, data: cleanDate(date) } },
    data: { proposed: true },
  };
}

async function proposeDebtPayment({ householdId, creditor, amount }) {
  const res = await db.execute({
    sql: `SELECT id, creditor_name, remaining_amount, monthly_payment FROM debts WHERE household_id = ? AND status = 'pending' ORDER BY created_at DESC`,
    args: [householdId],
  });
  const debts = res.rows || [];
  const wanted = String(creditor || '').toLowerCase().trim();
  const matches = wanted ? debts.filter(d => String(d.creditor_name || '').toLowerCase().includes(wanted)) : debts;
  if (matches.length !== 1) {
    return { success: false, data: { error: matches.length === 0 ? 'Dívida não encontrada.' : 'Mais de uma dívida corresponde.', pendingCreditors: debts.map(d => d.creditor_name) } };
  }
  const debt = matches[0];
  const remaining = Number(debt.remaining_amount || 0);
  let value = amount !== undefined && amount !== null && amount !== '' ? parseAmount(amount) : Number(debt.monthly_payment || 0) || remaining;
  value = Math.round(Math.min(value, remaining) * 100) / 100;
  if (!Number.isFinite(value) || value <= 0) return { success: false, data: { error: 'Valor inválido. Pergunta ao utilizador quanto pagou.' } };
  return {
    success: true,
    proposal: { action: 'pay_debt', payload: { debtId: debt.id, amount: value }, creditor: debt.creditor_name, remainingAfter: Math.max(0, remaining - value) },
    data: { proposed: true },
  };
}

async function proposeXitiquePayment({ householdId, name }) {
  const res = await db.execute({
    sql: `
      SELECT c.id, c.amount, cy.due_date, x.name
      FROM xitique_contributions c
      JOIN xitique_cycles cy ON cy.id = c.cycle_id
      JOIN xitiques x ON x.id = c.xitique_id
      WHERE x.household_id = ? AND x.status = 'active' AND c.paid = 0
      ORDER BY cy.due_date ASC
    `,
    args: [householdId],
  });
  const wanted = String(name || '').toLowerCase().trim();
  const rows = (res.rows || []).filter(r => !wanted || String(r.name || '').toLowerCase().includes(wanted));
  const next = rows[0];
  if (!next) return { success: false, data: { error: 'Não há contribuições de xitique por pagar.' } };
  return {
    success: true,
    proposal: { action: 'pay_xitique', payload: { contributionId: next.id }, amount: Number(next.amount || 0), name: next.name, dueDate: next.due_date ? String(next.due_date).slice(0, 10) : null },
    data: { proposed: true },
  };
}

const money = (n, lang) => Number(n || 0).toLocaleString(lang === 'en' ? 'en-US' : 'pt-MZ', { maximumFractionDigits: 2 });

// The reply the app shows above the "Confirmar / Cancelar" buttons.
function proposalResponse(proposal, language = 'pt') {
  const en = language === 'en';
  let message;
  if (proposal.action === 'add_transaction') {
    const p = proposal.payload;
    const kind = p.tipo === 'receita' ? (en ? 'income' : 'entrada') : (en ? 'expense' : 'despesa');
    message = en
      ? `Shall I record this ${kind}? **${p.desc}**: ${money(p.valor, language)} MT, ${p.data}.`
      : `Queres que registe esta ${kind}? **${p.desc}**: MT ${money(p.valor, language)}, ${p.data}.`;
  } else if (proposal.action === 'pay_debt') {
    message = en
      ? `Shall I record a payment of ${money(proposal.payload.amount, language)} MT to **${proposal.creditor}**? ${money(proposal.remainingAfter, language)} MT will be left.`
      : `Queres que registe um pagamento de MT ${money(proposal.payload.amount, language)} a **${proposal.creditor}**? Fica a faltar MT ${money(proposal.remainingAfter, language)}.`;
  } else {
    const due = proposal.dueDate ? (en ? ` (due ${proposal.dueDate})` : ` (vence ${proposal.dueDate})`) : '';
    message = en
      ? `Shall I mark the ${money(proposal.amount, language)} MT contribution to **${proposal.name}**${due} as paid?`
      : `Queres que marque como paga a contribuição de MT ${money(proposal.amount, language)} do xitique **${proposal.name}**${due}?`;
  }
  return { message, insight_type: 'action', biblical_insight: null, alerta: null, quick_actions: [], pending_action: proposal, data: { proposal: true } };
}

// Offline shortcut: "gastei 500 no chapa", "paguei 1.200 de luz", "recebi 15000 de salário".
function detectQuickTransaction(message) {
  const text = String(message || '').trim();
  const m = text.match(/^(?:hoje\s+|ontem\s+)?(gastei|paguei|comprei|recebi|ganhei|spent|paid|received|earned)\s+(?:mt\s*)?([\d][\d.,\s]*)\s*(?:mt|mzn|meticais)?\s*(?:(?:no|na|nos|nas|em|de|do|da|com|para|on|for|from)\s+)?(.*)$/i);
  if (!m) return null;
  const verb = m[1].toLowerCase();
  const type = ['recebi', 'ganhei', 'received', 'earned'].includes(verb) ? 'receita' : 'despesa';
  const description = (m[3] || '').replace(/[.!?]+$/, '').trim();
  const result = proposeTransaction({ type, amount: m[2].trim(), description: description ? description.charAt(0).toUpperCase() + description.slice(1) : '', date: /^ontem/i.test(text) ? new Date(Date.now() - 864e5).toISOString().slice(0, 10) : undefined });
  return result.success ? result.proposal : null;
}

module.exports = { proposeTransaction, proposeDebtPayment, proposeXitiquePayment, proposalResponse, detectQuickTransaction, guessCategory, parseAmount, CATEGORIES };
