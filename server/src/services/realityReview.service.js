const { createHash, randomUUID } = require('crypto');
const { db } = require('../config/db');
const GROUPS = ['balances', 'commitments', 'plan'];
const ABSENCE_DAYS = 30;
const DAY = 86400000;
const userKey = id => `rr_user_${id}`;
const parse = value => { try { return JSON.parse(value); } catch { return null; } };
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const money = value => Math.round(Number(value || 0) * 100) / 100;
const problem = (code, status = 409) => Object.assign(new Error(code), { status });
function readMeta(value) {
  const data = parse(value);
  return data?.version === 1 ? data : { version: 1, lastSeenAt: null, needsReview: false, startedAt: null, completedAt: null, deferredUntil: null, confirmations: {} };
}
function recordVisit(meta, now = new Date()) {
  const last = Date.parse(meta.lastSeenAt);
  const absenceDays = Number.isFinite(last) ? Math.max(0, Math.floor((now.getTime() - last) / DAY)) : null;
  const returnsAfterAbsence = absenceDays !== null && absenceDays >= ABSENCE_DAYS;
  return { ...meta, lastSeenAt: now.toISOString(), ...(returnsAfterAbsence ? { needsReview: true, startedAt: now.toISOString(), deferredUntil: null } : {}), absenceDays: returnsAfterAbsence ? absenceDays : meta.absenceDays ?? null };
}
function reviewStatus(meta, snapshot, now = new Date()) {
  const fingerprints = Object.fromEntries(GROUPS.map(group => [group, hash(snapshot[group])]));
  const sections = Object.fromEntries(GROUPS.map(group => {
    const record = meta.confirmations?.[group];
    const matches = record?.fingerprint === fingerprints[group];
    const withinCurrentReview = !meta.startedAt || record?.confirmedAt >= meta.startedAt;
    return [group, { fingerprint: fingerprints[group], confirmed: Boolean(matches && withinCurrentReview), confirmedAt: record?.confirmedAt || null, changed: Boolean(record && !matches) }];
  }));
  const prompt = Boolean(meta.needsReview && (!meta.deferredUntil || Date.parse(meta.deferredUntil) <= now.getTime()));
  return { ...meta, sections, prompt, absenceThresholdDays: ABSENCE_DAYS };
}
async function lockHousehold(tx, householdId) {
  const result = await tx.execute({ sql: 'SELECT id, cash_balance FROM households WHERE id = ? FOR UPDATE', args: [householdId] });
  if (!result.rows[0]) throw problem('HOUSEHOLD_NOT_FOUND', 404);
  return result.rows[0];
}
async function loadMeta(tx, householdId, userId) {
  const result = await tx.execute({ sql: 'SELECT value FROM settings WHERE household_id = ? AND key = ?', args: [householdId, userKey(userId)] });
  return readMeta(result.rows[0]?.value);
}
async function saveSetting(tx, householdId, key, value) {
  await tx.execute({ sql: 'INSERT INTO settings (key, value, household_id) VALUES (?, ?, ?) ON CONFLICT(key, household_id) DO UPDATE SET value = EXCLUDED.value', args: [key, JSON.stringify(value), householdId] });
}
async function snapshot(tx, householdId) {
  const household = await tx.execute({ sql: 'SELECT cash_balance FROM households WHERE id = ?', args: [householdId] });
  const accounts = await tx.execute({ sql: 'SELECT id, name, current_balance FROM accounts WHERE household_id = ? ORDER BY id', args: [householdId] });
  const settings = await tx.execute({ sql: 'SELECT key, value FROM settings WHERE household_id = ? ORDER BY key', args: [householdId] });
  const values = Object.fromEntries(settings.rows.filter(row => !row.key.startsWith('rr_')).map(row => [row.key, row.value]));
  const debts = await tx.execute({ sql: 'SELECT id, creditor_name, remaining_amount, monthly_payment, due_date, status FROM debts WHERE household_id = ? ORDER BY id', args: [householdId] });
  const goals = await tx.execute({ sql: 'SELECT id, name, target_amount, saved_amount, deadline FROM goals WHERE household_id = ? ORDER BY id', args: [householdId] });
  const budgets = await tx.execute({ sql: 'SELECT category, limit_amount FROM budgets WHERE household_id = ? ORDER BY category', args: [householdId] });
  return {
    balances: { cash: money(household.rows[0]?.cash_balance), accounts: accounts.rows.map(row => ({ id: Number(row.id), name: row.name, balance: money(row.current_balance) })) },
    commitments: { salary: values.user_salary ?? null, rent: values.default_rent ?? null, landlord: values.landlord_name || '', debts: debts.rows.map(row => ({ ...row, id: Number(row.id), remaining_amount: money(row.remaining_amount), monthly_payment: money(row.monthly_payment) })) },
    plan: { goals: goals.rows.map(row => ({ ...row, id: Number(row.id), target_amount: money(row.target_amount), saved_amount: money(row.saved_amount) })), budgets: budgets.rows.map(row => ({ ...row, limit_amount: money(row.limit_amount) })), journey: values.financial_journey_v1 || null },
  };
}
async function getReview(householdId, userId) {
  return db.withTransaction(async tx => {
    const meta = await loadMeta(tx, householdId, userId);
    const current = await snapshot(tx, householdId);
    const ledger = await tx.execute({ sql: "SELECT value FROM settings WHERE household_id = ? AND left(key, 10) = 'rr_adjust_' ORDER BY (value::jsonb ->> 'recordedAt') DESC LIMIT 50", args: [householdId] });
    return { status: reviewStatus(meta, current), snapshot: current, adjustments: ledger.rows.map(row => parse(row.value)).filter(Boolean) };
  });
}
async function visit(householdId, userId, now = new Date()) {
  return db.withTransaction(async tx => {
    await lockHousehold(tx, householdId);
    const meta = recordVisit(await loadMeta(tx, householdId, userId), now);
    await saveSetting(tx, householdId, userKey(userId), meta);
    return { needsReview: meta.needsReview, prompt: Boolean(meta.needsReview && (!meta.deferredUntil || Date.parse(meta.deferredUntil) <= now.getTime())), absenceDays: meta.absenceDays, completedAt: meta.completedAt };
  });
}
async function changeReview(householdId, userId, command, now = new Date()) {
  return db.withTransaction(async tx => {
    await lockHousehold(tx, householdId);
    const meta = await loadMeta(tx, householdId, userId);
    if (command.action === 'start') {
      if (!meta.needsReview) { meta.startedAt = now.toISOString(); meta.needsReview = true; }
      meta.deferredUntil = null;
    } else if (command.action === 'defer') {
      meta.deferredUntil = new Date(now.getTime() + 7 * DAY).toISOString();
    } else {
      const current = await snapshot(tx, householdId);
      const status = reviewStatus(meta, current, now);
      if (command.action === 'confirm') {
        if (status.sections[command.section].fingerprint !== command.fingerprint) throw problem('DATA_CHANGED');
        meta.confirmations = { ...meta.confirmations, [command.section]: { fingerprint: command.fingerprint, confirmedAt: now.toISOString() } };
      } else if (command.action === 'finish') {
        if (!GROUPS.every(group => status.sections[group].confirmed)) throw problem('REVIEW_INCOMPLETE');
        meta.completedAt = now.toISOString(); meta.needsReview = false; meta.deferredUntil = null;
        await saveSetting(tx, householdId, `rr_done_${randomUUID()}`, { version: 1, userId, completedAt: meta.completedAt, confirmations: meta.confirmations });
      }
    }
    await saveSetting(tx, householdId, userKey(userId), meta);
    return { success: true };
  });
}
async function reconcile(householdId, userId, data, now = new Date()) {
  return db.withTransaction(async tx => {
    const household = await lockHousehold(tx, householdId);
    const key = `rr_adjust_${data.requestId}`;
    const existing = await tx.execute({ sql: 'SELECT value FROM settings WHERE household_id = ? AND key = ?', args: [householdId, key] });
    if (existing.rows[0]) {
      const record = parse(existing.rows[0].value);
      if (record?.accountId !== data.accountId || record?.newBalance !== data.balance || record?.reason !== data.reason || record?.asOf !== data.asOf || record?.userId !== userId) throw problem('REQUEST_REUSED');
      return { adjustment: record, repeated: true };
    }
    let row = household;
    if (data.accountId !== null) {
      const account = await tx.execute({ sql: 'SELECT id, name, current_balance FROM accounts WHERE id = ? AND household_id = ? FOR UPDATE', args: [data.accountId, householdId] });
      row = account.rows[0];
      if (!row) throw problem('ACCOUNT_NOT_FOUND', 404);
    }
    const previousBalance = money(data.accountId === null ? row.cash_balance : row.current_balance);
    if (previousBalance !== money(data.expectedBalance)) throw problem('BALANCE_CHANGED');
    const record = { version: 1, requestId: data.requestId, accountId: data.accountId, accountName: data.accountId === null ? null : row.name, previousBalance, newBalance: money(data.balance), difference: money(data.balance - previousBalance), asOf: data.asOf, reason: data.reason, userId, recordedAt: now.toISOString() };
    if (data.accountId === null) await tx.execute({ sql: 'UPDATE households SET cash_balance = ? WHERE id = ?', args: [record.newBalance, householdId] });
    else await tx.execute({ sql: 'UPDATE accounts SET current_balance = ? WHERE id = ? AND household_id = ?', args: [record.newBalance, data.accountId, householdId] });
    // The audit record and new balance commit together. No transaction is invented.
    await saveSetting(tx, householdId, key, record);
    return { adjustment: record, repeated: false };
  });
}
async function getFreshness(householdId, userId) {
  try {
    return await db.withTransaction(async tx => {
      const meta = await loadMeta(tx, householdId, userId);
      const status = reviewStatus(meta, await snapshot(tx, householdId));
      return { available: true, needsReview: status.needsReview || Object.values(status.sections).some(section => section.changed), completedAt: status.completedAt, sections: status.sections };
    });
  } catch { return { available: false, needsReview: false, completedAt: null, sections: {} }; }
}
module.exports = { getFreshness, GROUPS, ABSENCE_DAYS, readMeta, recordVisit, reviewStatus, getReview, visit, changeReview, reconcile };
