const { db } = require('../../config/db');
const logger = require('../../utils/logger');
const rules = require('./advisorRules');
const { loadSnapshot } = require('./advisorData');
const { maskLabel } = require('../../utils/privacyMask');

// Binth as an advisor: settings, memory, plans, reminders and the daily sweep
// that decides whether to speak first. It never moves money: anything that
// writes goes through a proposal the person confirms in the app.

const LEVELS = ['off', 'discreet', 'normal', 'close'];
const DEFAULT_SETTINGS = { level: 'normal', quietStart: 21, quietEnd: 7, weekly: true, whatsapp: false };
const MAX_MEMORY = 30;

async function initAdvisorSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS advisor_memory (
      id SERIAL PRIMARY KEY,
      household_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      fact TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    'CREATE INDEX IF NOT EXISTS idx_advisor_memory_user ON advisor_memory (user_id)',
    `CREATE TABLE IF NOT EXISTS advisor_plans (
      id SERIAL PRIMARY KEY,
      household_id INTEGER NOT NULL,
      user_id INTEGER,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    'CREATE INDEX IF NOT EXISTS idx_advisor_plans_household ON advisor_plans (household_id, status)',
    `CREATE TABLE IF NOT EXISTS advisor_reminders (
      id SERIAL PRIMARY KEY,
      household_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      remind_on DATE NOT NULL,
      text TEXT NOT NULL,
      sent_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    'CREATE INDEX IF NOT EXISTS idx_advisor_reminders_due ON advisor_reminders (remind_on) WHERE sent_at IS NULL',
    // One proactive message per person per day; and never the same alert twice.
    `CREATE TABLE IF NOT EXISTS advisor_daily (
      user_id INTEGER NOT NULL,
      day DATE NOT NULL,
      alert_id TEXT,
      PRIMARY KEY (user_id, day)
    )`,
    `CREATE TABLE IF NOT EXISTS advisor_sent_alerts (
      user_id INTEGER NOT NULL,
      alert_id TEXT NOT NULL,
      sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, alert_id)
    )`,
    // An audit trail of what the advisor told each person and on what data
    // (for the BdM sandbox): alert id, kind, the numbers it used.
    `CREATE TABLE IF NOT EXISTS advisor_log (
      id SERIAL PRIMARY KEY,
      household_id INTEGER NOT NULL,
      user_id INTEGER,
      kind TEXT NOT NULL,
      channel TEXT NOT NULL,
      summary TEXT NOT NULL,
      basis JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
  ];
  for (const table of ['advisor_memory', 'advisor_plans', 'advisor_reminders', 'advisor_daily', 'advisor_sent_alerts', 'advisor_log']) {
    statements.push(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
  }
  statements.push("DELETE FROM advisor_daily WHERE day < CURRENT_DATE - INTERVAL '14 days'");
  statements.push("DELETE FROM advisor_sent_alerts WHERE sent_at < NOW() - INTERVAL '120 days'");
  try {
    for (const sql of statements) await db.execute({ sql, args: [] });
    logger.info('advisor tables initialized or already exist.');
  } catch (error) {
    logger.warn(`Failed to initialize advisor tables: ${error.message}`);
  }
}

// ---------- settings (per household, in the settings table) ----------

async function getSettings(householdId) {
  const res = await db.execute({
    sql: `SELECT key, value FROM settings WHERE household_id = ? AND key LIKE 'advisor_%'`,
    args: [householdId],
  }).catch(() => ({ rows: [] }));
  const raw = Object.fromEntries((res.rows || []).map(r => [r.key, r.value]));
  const bool = (v, d) => (v === undefined ? d : v === 'true' || v === true);
  const int = (v, d) => (Number.isInteger(Number(v)) ? Number(v) : d);
  return {
    level: LEVELS.includes(raw.advisor_level) ? raw.advisor_level : DEFAULT_SETTINGS.level,
    quietStart: int(raw.advisor_quiet_start, DEFAULT_SETTINGS.quietStart),
    quietEnd: int(raw.advisor_quiet_end, DEFAULT_SETTINGS.quietEnd),
    weekly: bool(raw.advisor_weekly, DEFAULT_SETTINGS.weekly),
    whatsapp: bool(raw.advisor_whatsapp, DEFAULT_SETTINGS.whatsapp),
    titheRate: raw.advisor_tithe_rate === undefined ? null : Number(raw.advisor_tithe_rate),
    savingsRate: raw.advisor_savings_rate === undefined ? null : Number(raw.advisor_savings_rate),
  };
}

async function updateSettings(householdId, changes) {
  const map = {
    level: 'advisor_level', quietStart: 'advisor_quiet_start', quietEnd: 'advisor_quiet_end',
    weekly: 'advisor_weekly', whatsapp: 'advisor_whatsapp', titheRate: 'advisor_tithe_rate', savingsRate: 'advisor_savings_rate',
  };
  for (const [field, key] of Object.entries(map)) {
    if (changes[field] === undefined) continue;
    if (changes[field] === null) {
      await db.execute({ sql: 'DELETE FROM settings WHERE household_id = ? AND key = ?', args: [householdId, key] });
      continue;
    }
    const value = String(changes[field]);
    await db.execute({
      sql: 'INSERT INTO settings (key, value, household_id) VALUES (?, ?, ?) ON CONFLICT(key, household_id) DO UPDATE SET value = EXCLUDED.value',
      args: [key, value, householdId],
    });
  }
  return getSettings(householdId);
}

// ---------- memory (facts the person agreed to keep) ----------

async function listMemory(householdId, userId) {
  const res = await db.execute({
    sql: 'SELECT id, fact, created_at FROM advisor_memory WHERE household_id = ? AND user_id = ? ORDER BY created_at ASC',
    args: [householdId, userId],
  }).catch(() => ({ rows: [] }));
  return res.rows || [];
}

async function addMemory(householdId, userId, fact) {
  const text = maskLabel(String(fact || '').replace(/\s+/g, ' ').trim(), 200);
  if (!text) throw new Error('EMPTY');
  const existing = await listMemory(householdId, userId);
  if (existing.some(m => m.fact.toLowerCase() === text.toLowerCase())) return existing.find(m => m.fact.toLowerCase() === text.toLowerCase());
  if (existing.length >= MAX_MEMORY) throw new Error('FULL');
  const res = await db.execute({
    sql: 'INSERT INTO advisor_memory (household_id, user_id, fact) VALUES (?, ?, ?) RETURNING id, fact, created_at',
    args: [householdId, userId, text],
  });
  return res.rows[0];
}

async function deleteMemory(householdId, userId, id) {
  await db.execute({ sql: 'DELETE FROM advisor_memory WHERE id = ? AND household_id = ? AND user_id = ?', args: [id, householdId, userId] });
}

async function clearMemory(householdId, userId) {
  await db.execute({ sql: 'DELETE FROM advisor_memory WHERE household_id = ? AND user_id = ?', args: [householdId, userId] });
}

// Lines for the Binth system prompt (masked again, never more than 30).
async function memoryForPrompt(householdId, userId) {
  const facts = await listMemory(householdId, userId);
  return facts.map(f => `- ${maskLabel(f.fact, 200)}`).join('\n');
}

// ---------- plans ----------

const PLAN_KINDS = ['salary', 'monthly', 'debt', 'emergency', 'goal', 'credit'];

async function listPlans(householdId) {
  const res = await db.execute({
    sql: `SELECT id, kind, title, data, status, created_at FROM advisor_plans WHERE household_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 20`,
    args: [householdId],
  }).catch(() => ({ rows: [] }));
  return res.rows || [];
}

// Saves a plan the person accepted. A monthly plan also sets the budgets of its
// envelopes (same rule as the Budget page). One active plan per kind: the new
// one replaces the old.
async function createPlan(householdId, userId, { kind, title, data }) {
  if (!PLAN_KINDS.includes(kind)) throw new Error('BAD_KIND');
  const cleanTitle = String(title || '').trim().slice(0, 120) || kind;
  return db.withTransaction(async (tx) => {
    await tx.execute({ sql: `UPDATE advisor_plans SET status = 'replaced' WHERE household_id = ? AND kind = ? AND status = 'active'`, args: [householdId, kind] });
    if (kind === 'monthly') {
      for (const e of (data?.envelopes || []).slice(0, 12)) {
        const limit = Number(e.limit);
        if (!e.category || !Number.isFinite(limit) || limit <= 0) continue;
        await tx.execute({
          sql: `INSERT INTO budgets (category, limit_amount, household_id) VALUES (?, ?, ?)
                ON CONFLICT(category, household_id) DO UPDATE SET limit_amount = EXCLUDED.limit_amount`,
          args: [String(e.category).slice(0, 50), limit, householdId],
        });
      }
    }
    const res = await tx.execute({
      sql: 'INSERT INTO advisor_plans (household_id, user_id, kind, title, data) VALUES (?, ?, ?, ?, ?::jsonb) RETURNING id, kind, title, data, status, created_at',
      args: [householdId, userId, kind, cleanTitle, JSON.stringify(data || {})],
    });
    return res.rows[0];
  });
}

async function archivePlan(householdId, id) {
  await db.execute({ sql: `UPDATE advisor_plans SET status = 'archived' WHERE id = ? AND household_id = ?`, args: [id, householdId] });
}

// ---------- reminders ----------

async function createReminder(householdId, userId, { date, text }) {
  const day = String(date || '').slice(0, 10);
  const today = rules.todayMz();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < today || day > rules.addDays(today, 366)) throw new Error('BAD_DATE');
  const clean = maskLabel(String(text || '').trim(), 140);
  if (!clean) throw new Error('EMPTY');
  const res = await db.execute({
    sql: 'INSERT INTO advisor_reminders (household_id, user_id, remind_on, text) VALUES (?, ?, ?, ?) RETURNING id, remind_on, text',
    args: [householdId, userId, day, clean],
  });
  return res.rows[0];
}

async function listReminders(householdId, userId) {
  const res = await db.execute({
    sql: 'SELECT id, to_char(remind_on, \'YYYY-MM-DD\') AS remind_on, text FROM advisor_reminders WHERE household_id = ? AND user_id = ? AND sent_at IS NULL ORDER BY remind_on ASC LIMIT 20',
    args: [householdId, userId],
  }).catch(() => ({ rows: [] }));
  return res.rows || [];
}

async function deleteReminder(householdId, userId, id) {
  await db.execute({ sql: 'DELETE FROM advisor_reminders WHERE id = ? AND household_id = ? AND user_id = ?', args: [id, householdId, userId] });
}

// ---------- what the app shows ----------

const DISCLAIMER = {
  pt: 'A Binth ajuda a organizar. Não é aconselhamento financeiro licenciado.',
  en: 'Binth helps you get organised. It is not licensed financial advice.',
};

async function getToday(householdId, userId, lang = 'pt') {
  const today = rules.todayMz();
  const [snapshot, settings] = await Promise.all([loadSnapshot(householdId, userId, today), getSettings(householdId)]);
  snapshot.prefs = { ...snapshot.prefs, titheRate: settings.titheRate ?? undefined, savingsRate: settings.savingsRate ?? undefined };
  const alerts = rules.buildAlerts(snapshot, today, lang);
  const forecast = rules.forecastBalance(snapshot, today);
  return {
    today,
    top: alerts[0] || null,
    alerts: alerts.slice(0, 6),
    forecast: { ...forecast, commitments: forecast.commitments.slice(0, 10) },
    balance: Math.round(snapshot.balance),
    disclaimer: DISCLAIMER[lang] || DISCLAIMER.pt,
  };
}

async function getPlanOverview(householdId, userId, lang = 'pt') {
  const today = rules.todayMz();
  const [snapshot, settings, plans] = await Promise.all([loadSnapshot(householdId, userId, today), getSettings(householdId), listPlans(householdId)]);
  const prefs = { titheRate: settings.titheRate ?? undefined, savingsRate: settings.savingsRate ?? undefined };
  snapshot.prefs = prefs;
  const lastIncome = [...snapshot.transactions].reverse().find(t => t.type === 'receita');
  return {
    today,
    forecast: rules.forecastBalance(snapshot, today),
    monthly: rules.monthlyPlan(snapshot, today, prefs),
    salary: rules.salaryPlan(snapshot, today, snapshot.payday?.amount || lastIncome?.amount || 0, prefs),
    debt: {
      avalanche: rules.simulateDebtPayoff(snapshot.debts, 0, 'avalanche'),
      snowball: rules.simulateDebtPayoff(snapshot.debts, 0, 'snowball'),
      debts: snapshot.debts.map(d => ({ id: d.id, name: d.creditor_name, remaining: Number(d.remaining_amount || 0), monthly: Number(d.monthly_payment || 0) })),
    },
    emergency: rules.emergencyFundPlan(snapshot, today),
    credit: rules.creditReadiness(snapshot, today),
    recurring: rules.detectRecurring(snapshot.transactions, today),
    goals: snapshot.goals.map(g => rules.goalStatus(g, today)).filter(Boolean),
    plans,
    budgets: snapshot.budgets,
    disclaimer: DISCLAIMER[lang] || DISCLAIMER.pt,
  };
}

async function getWeekly(householdId, userId) {
  const today = rules.todayMz();
  const snapshot = await loadSnapshot(householdId, userId, today);
  return rules.weeklySummary(snapshot, today);
}

async function getMonthClose(householdId, userId, month) {
  const today = rules.todayMz();
  const target = /^\d{4}-\d{2}$/.test(String(month || '')) ? month : rules.monthOf(rules.addMonths(`${rules.monthOf(today)}-01`, -1));
  const snapshot = await loadSnapshot(householdId, userId, today);
  const close = rules.monthClose(snapshot, target);
  return { ...close, nextMonth: rules.monthlyPlan(snapshot, today, snapshot.prefs) };
}

async function logAdvice({ householdId, userId, kind, channel, summary, basis }) {
  await db.execute({
    sql: 'INSERT INTO advisor_log (household_id, user_id, kind, channel, summary, basis) VALUES (?, ?, ?, ?, ?, ?::jsonb)',
    args: [householdId, userId || null, kind, channel, String(summary).slice(0, 300), JSON.stringify(basis || {})],
  }).catch(() => {});
}

module.exports = {
  initAdvisorSchema, getSettings, updateSettings, LEVELS, DEFAULT_SETTINGS,
  listMemory, addMemory, deleteMemory, clearMemory, memoryForPrompt, MAX_MEMORY,
  listPlans, createPlan, archivePlan, PLAN_KINDS,
  createReminder, listReminders, deleteReminder,
  getToday, getPlanOverview, getWeekly, getMonthClose, logAdvice, DISCLAIMER,
};
