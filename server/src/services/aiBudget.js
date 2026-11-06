const { db } = require('../config/db');
const logger = require('../utils/logger');
const { monthSpendUsd } = require('./aiTelemetry');

// Monthly ceiling for Mwanga's own AI keys (personal keys are the person's own
// account and never count). Set AI_MONTHLY_BUDGET_USD on Render, e.g. 20.
// Without it there is no ceiling, only the per-person daily limit.
//
// At AI_BUDGET_ALERT_RATIO (default 0.8) the admins get an email; at 100 %
// Mwanga's keys stop answering until the next month and Binth uses the local
// rules (people with their own key are not affected). One email per threshold
// per month.
const CACHE_MS = 5 * 60 * 1000;

function budgetUsd() {
  const n = Number(process.env.AI_MONTHLY_BUDGET_USD);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function alertRatio() {
  const n = Number(process.env.AI_BUDGET_ALERT_RATIO);
  return Number.isFinite(n) && n > 0 && n < 1 ? n : 0.8;
}

let cache = { at: 0, state: null };

async function initAiBudgetSchema() {
  try {
    await db.execute({
      sql: `CREATE TABLE IF NOT EXISTS ai_budget_alerts (
        month TEXT NOT NULL,
        threshold TEXT NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (month, threshold)
      )`,
      args: [],
    });
    await db.execute({ sql: 'ALTER TABLE ai_budget_alerts ENABLE ROW LEVEL SECURITY', args: [] });
  } catch (error) {
    logger.warn(`Failed to initialize ai_budget_alerts table: ${error.message}`);
  }
}

// Claims the alert for this month and threshold; false if it was already sent.
async function claimAlert(month, threshold) {
  const res = await db.execute({
    sql: `INSERT INTO ai_budget_alerts (month, threshold) VALUES (?, ?)
          ON CONFLICT (month, threshold) DO NOTHING RETURNING month`,
    args: [month, threshold],
  });
  return (res.rows || []).length > 0;
}

async function alertAdmins(threshold, spent, budget) {
  const month = new Date().toISOString().slice(0, 7);
  if (!(await claimAlert(month, threshold))) return;
  const admins = await db.execute({ sql: "SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL", args: [] });
  const to = (admins.rows || []).map(r => r.email).filter(Boolean);
  const over = threshold === 'limit';
  const subject = over
    ? `Mwanga: orçamento de IA de ${month} esgotado`
    : `Mwanga: ${Math.round(alertRatio() * 100)}% do orçamento de IA de ${month}`;
  const text = [
    `Gasto estimado este mês nas chaves de IA do Mwanga: USD ${spent.toFixed(2)} de USD ${budget.toFixed(2)}.`,
    over
      ? 'As chaves do Mwanga deixaram de responder até ao próximo mês. A Binth responde com as regras locais; quem ligou a própria chave não é afectado. Para continuar, aumenta AI_MONTHLY_BUDGET_USD no Render.'
      : 'Quando chegar a 100 %, as chaves do Mwanga param até ao próximo mês.',
    'Detalhe por dia e por modelo: GET /api/admin/ai-metrics.',
  ].join('\n\n');
  logger.warn({ threshold, spentUsd: spent, budgetUsd: budget }, 'AI budget alert');
  if (!to.length) return;
  const emailService = require('./email.service');
  for (const address of to) {
    await emailService.send({ to: address, subject, text }).catch(err =>
      logger.warn({ err: err.message }, 'Could not send AI budget alert'));
  }
}

// { budget, spent, blocked }. Cached for 5 minutes; when the spend cannot be
// read the last known state is kept (and with no state, Mwanga's keys stay on:
// the per-person daily limit still applies).
async function budgetState(now = Date.now()) {
  const budget = budgetUsd();
  if (!budget) return { budget: null, spent: null, blocked: false };
  if (cache.state && now - cache.at < CACHE_MS && cache.state.budget === budget) return cache.state;
  try {
    const spent = await monthSpendUsd();
    const state = { budget, spent, blocked: spent >= budget };
    cache = { at: now, state };
    if (spent >= budget) await alertAdmins('limit', spent, budget).catch(() => {});
    else if (spent >= budget * alertRatio()) await alertAdmins('warning', spent, budget).catch(() => {});
    return state;
  } catch (err) {
    logger.warn({ err: err.message }, 'Could not read AI spend');
    return cache.state || { budget, spent: null, blocked: false };
  }
}

async function isOverBudget() {
  return (await budgetState()).blocked;
}

function resetBudgetCache() { cache = { at: 0, state: null }; }

module.exports = { budgetState, isOverBudget, initAiBudgetSchema, resetBudgetCache };
