const { db } = require('../../config/db');
const rules = require('./advisorRules');

// Loads everything the advisor rules need for one household, in parallel.
// Only the last 150 days of transactions: enough for payday, averages and the
// month close, and cheap to run for every person every hour.
async function loadSnapshot(householdId, userId, today = rules.todayMz()) {
  const since = rules.addDays(today, -150);
  const q = (sql, args) => db.execute({ sql, args }).then(r => r.rows || []).catch(() => []);
  const [accounts, transactions, budgets, debts, xitiqueDue, rentDue, goals, plans, settings] = await Promise.all([
    q('SELECT id, name, type, current_balance FROM accounts WHERE household_id = ?', [householdId]),
    q(`SELECT id, date, type, amount, category, description FROM transactions
       WHERE household_id = ? AND date >= ? ORDER BY date ASC, id ASC LIMIT 3000`, [householdId, since]),
    q(`SELECT b.category, b.limit_amount, COALESCE(SUM(t.amount), 0) AS spent
       FROM budgets b
       LEFT JOIN transactions t ON t.category = b.category AND t.household_id = b.household_id
         AND t.type IN ('despesa', 'renda') AND t.date >= ?
       WHERE b.household_id = ? GROUP BY b.category, b.limit_amount`, [`${rules.monthOf(today)}-01`, householdId]),
    q(`SELECT id, creditor_name, remaining_amount, monthly_payment, due_date, interest_rate, interest_period
       FROM debts WHERE household_id = ? AND status = 'pending'`, [householdId]),
    q(`SELECT c.id AS "contributionId", c.amount, cy.due_date, x.name
       FROM xitique_contributions c
       JOIN xitique_cycles cy ON cy.id = c.cycle_id
       JOIN xitiques x ON x.id = c.xitique_id
       WHERE x.household_id = ? AND x.status = 'active' AND c.paid = 0
       ORDER BY cy.due_date ASC LIMIT 20`, [householdId]),
    q(`SELECT id, month, amount, landlord FROM rentals WHERE household_id = ? AND status = 'pendente' ORDER BY month ASC LIMIT 6`, [householdId]),
    q('SELECT id, name, target_amount, saved_amount, deadline, monthly_saving FROM goals WHERE household_id = ?', [householdId]),
    q(`SELECT id, kind, title, created_at FROM advisor_plans WHERE household_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 20`, [householdId]),
    q(`SELECT key, value FROM settings WHERE household_id = ? AND key IN ('advisor_tithe_rate', 'advisor_savings_rate')`, [householdId]),
  ]);
  const prefs = Object.fromEntries(settings.map(s => [s.key.replace('advisor_', '').replace(/_(\w)/g, (_, c) => c.toUpperCase()), Number(s.value)]));
  const snapshot = {
    householdId,
    userId,
    balance: accounts.reduce((s, a) => s + Number(a.current_balance || 0), 0),
    accounts,
    transactions: transactions.map(t => ({ ...t, date: String(t.date).slice(0, 10), amount: Number(t.amount || 0) })),
    budgets,
    debts,
    xitiqueDue,
    rentDue,
    goals,
    plans: plans.map(p => ({ ...p, created_at: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : '' })),
    prefs,
  };
  snapshot.payday = rules.detectPayday(snapshot.transactions, today);
  return snapshot;
}

module.exports = { loadSnapshot };
