// Binth as a financial advisor: the calculations behind every alert and plan.
//
// Pure functions, no database and no AI. They take a snapshot of the household's
// money (see advisorData.js) and a calendar day ('YYYY-MM-DD', Maputo time), so
// they are cheap to run for every person every hour and easy to test.

const DAY_MS = 24 * 3600 * 1000;

// ---------- dates ----------

const MZ_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo', year: 'numeric', month: '2-digit', day: '2-digit' });
const MZ_HOUR = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Maputo', hour: '2-digit', hourCycle: 'h23' });
const MZ_WEEKDAY = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Maputo', weekday: 'short' });

function todayMz(now = new Date()) { return MZ_DAY.format(now); }
function hourMz(now = new Date()) { return Number(MZ_HOUR.format(now)); }
function weekdayMz(now = new Date()) { return MZ_WEEKDAY.format(now); } // 'Mon'..'Sun'

function toTime(day) { return Date.parse(`${String(day).slice(0, 10)}T00:00:00Z`); }
function addDays(day, n) { return new Date(toTime(day) + n * DAY_MS).toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((toTime(b) - toTime(a)) / DAY_MS); }
function daysInMonth(year, month1) { return new Date(Date.UTC(year, month1, 0)).getUTCDate(); }
function monthOf(day) { return String(day).slice(0, 7); }
function addMonths(day, n) {
  const [y, m, d] = String(day).slice(0, 10).split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, daysInMonth(ny, nm))).padStart(2, '0')}`;
}

// ---------- helpers ----------

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round = (n, step = 1) => Math.round(num(n) / step) * step;
const median = (values) => {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return 0;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};
const isExpense = (t) => ['despesa', 'renda'].includes(t.type);
const isIncome = (t) => t.type === 'receita';
const catKey = (c) => String(c || 'other').toLowerCase();

// Spending that is already planned as a commitment (rent, debt, xitique, tithe,
// savings) is not "daily spending": it is added on its own date in the forecast.
const COMMITMENT_HINT = /renda|rent|habita|d[ií]vida|debt|xitique|poupan|saving|invest|d[ií]zimo|church/;
const ESSENTIAL_HINT = /food|aliment|transport|energy|água|agua|luz|health|sa[uú]de|education|educa|internet|house_rent|habita|renda/;

const CATEGORY_LABELS = {
  pt: { salary: 'Salário', house_rent: 'Renda de casa', food: 'Alimentação', transport: 'Transporte', health: 'Saúde', education: 'Educação', energy_water: 'Energia/Água', internet: 'Internet', church_donations: 'Igreja/Doações', leisure: 'Lazer', investments: 'Investimentos', savings: 'Poupança', other: 'Outros', xitique: 'Xitique', habitacao: 'Habitação' },
  en: { salary: 'Salary', house_rent: 'House rent', food: 'Food', transport: 'Transport', health: 'Health', education: 'Education', energy_water: 'Energy/Water', internet: 'Internet', church_donations: 'Church/Donations', leisure: 'Leisure', investments: 'Investments', savings: 'Savings', other: 'Others', xitique: 'Xitique', habitacao: 'Housing' },
};
// The person's word for a category ("food" -> "Alimentação"); unknown ones as they are.
function catLabel(category, lang = 'pt') {
  const key = String(category || 'other');
  return (CATEGORY_LABELS[lang] || CATEGORY_LABELS.pt)[key.toLowerCase()] || key;
}

function money(n, lang = 'pt') {
  const v = Number(n || 0).toLocaleString(lang === 'en' ? 'en-US' : 'pt-MZ', { maximumFractionDigits: 0 });
  return lang === 'en' ? `${v} MT` : `MT ${v}`;
}
function shortDate(day, lang = 'pt') {
  const d = new Date(toTime(day));
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

// ---------- payday and spending ----------

// The salary day: the biggest income of each of the last months, if it lands on
// a similar day (±4 days) at least twice. Null when there is no clear pattern.
function detectPayday(transactions, today) {
  const since = addDays(today, -120);
  const byMonth = new Map();
  for (const t of transactions) {
    if (!isIncome(t) || String(t.date) < since) continue;
    const m = monthOf(t.date);
    const best = byMonth.get(m);
    if (!best || num(t.amount) > num(best.amount)) byMonth.set(m, t);
  }
  const tops = [...byMonth.values()];
  if (tops.length < 2) {
    if (tops.length === 1 && /sal[aá]r|ordenado|salary/i.test(`${tops[0].category} ${tops[0].description}`)) {
      return { day: Number(String(tops[0].date).slice(8, 10)), amount: num(tops[0].amount), confidence: 'low' };
    }
    return null;
  }
  const days = tops.map(t => Number(String(t.date).slice(8, 10)));
  const day = Math.round(median(days));
  const close = days.filter(d => Math.abs(d - day) <= 4).length;
  if (close < 2) return null;
  return { day, amount: round(median(tops.map(t => num(t.amount))), 1), confidence: close >= 3 ? 'high' : 'medium' };
}

function nextPayday(today, payday) {
  if (!payday) return null;
  const [y, m, d] = today.split('-').map(Number);
  const thisMonth = `${y}-${String(m).padStart(2, '0')}-${String(Math.min(payday.day, daysInMonth(y, m))).padStart(2, '0')}`;
  if (payday.day > d) return thisMonth;
  const next = addMonths(`${y}-${String(m).padStart(2, '0')}-01`, 1);
  const [ny, nm] = next.split('-').map(Number);
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(payday.day, daysInMonth(ny, nm))).padStart(2, '0')}`;
}

// Average daily spending outside commitments, over the last `days` days.
function dailySpend(transactions, today, days = 60) {
  const since = addDays(today, -days);
  const total = transactions
    .filter(t => isExpense(t) && String(t.date) >= since && String(t.date) <= today && !COMMITMENT_HINT.test(catKey(t.category)))
    .reduce((s, t) => s + num(t.amount), 0);
  return total / days;
}

function monthlyIncome(transactions, today, payday) {
  if (payday?.amount) {
    const since = addDays(today, -95);
    const months = new Set(transactions.filter(t => String(t.date) >= since).map(t => monthOf(t.date)));
    const other = transactions.filter(t => isIncome(t) && String(t.date) >= since).reduce((s, t) => s + num(t.amount), 0);
    const avg = other / Math.max(1, Math.min(3, months.size));
    return Math.max(payday.amount, avg);
  }
  const since = addDays(today, -90);
  return transactions.filter(t => isIncome(t) && String(t.date) >= since).reduce((s, t) => s + num(t.amount), 0) / 3;
}

// ---------- commitments ----------

// Upcoming payments with a date: unpaid xitique, pending rent, debt instalments.
function upcomingCommitments(snapshot, today, until) {
  const items = [];
  for (const x of snapshot.xitiqueDue || []) {
    const due = String(x.due_date || '').slice(0, 10);
    if (due && due <= until) items.push({ kind: 'xitique', id: `x${x.contributionId}`, date: due < today ? today : due, overdue: due < today, amount: num(x.amount), label: x.name, ref: { contributionId: x.contributionId } });
  }
  for (const r of snapshot.rentDue || []) {
    const due = /^\d{4}-\d{2}$/.test(String(r.month)) ? `${r.month}-05` : today;
    if (due <= until) items.push({ kind: 'rent', id: `r${r.id}`, date: due < today ? today : due, overdue: due < today, amount: num(r.amount), label: r.landlord || '' });
  }
  for (const d of snapshot.debts || []) {
    if (!d.due_date) continue;
    const due = String(d.due_date).slice(0, 10);
    const amount = Math.min(num(d.remaining_amount), num(d.monthly_payment) || num(d.remaining_amount));
    if (amount > 0 && due <= until) items.push({ kind: 'debt', id: `d${d.id}`, date: due < today ? today : due, overdue: due < today, amount, label: d.creditor_name, ref: { debtId: d.id } });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- forecast ----------

// Balance day by day until the next payday (or 30 days). runoutDate = first day
// the balance goes below zero.
function forecastBalance(snapshot, today) {
  const payday = snapshot.payday ?? detectPayday(snapshot.transactions || [], today);
  const horizon = nextPayday(today, payday) || addDays(today, 30);
  const spend = dailySpend(snapshot.transactions || [], today);
  const commitments = upcomingCommitments(snapshot, today, horizon);
  let balance = num(snapshot.balance);
  const days = [];
  let runoutDate = null;
  const span = Math.max(1, daysBetween(today, horizon));
  for (let i = 0; i <= span; i += 1) {
    const day = addDays(today, i);
    if (i > 0) balance -= spend;
    for (const c of commitments) if (c.date === day) balance -= c.amount;
    if (balance < 0 && !runoutDate) runoutDate = day;
    days.push({ date: day, balance: round(balance) });
  }
  return {
    today,
    horizon,
    horizonIsPayday: Boolean(payday),
    payday,
    dailySpend: round(spend),
    commitments,
    days,
    endBalance: round(balance),
    runoutDate,
    // What to cut per day so the money lasts until the horizon.
    cutPerDay: runoutDate ? round(Math.abs(Math.min(0, balance)) / span, 10) : 0,
  };
}

// ---------- salary-day plan ----------

// How to split the salary the day it arrives: commitments first, tithe if the
// person gives, savings (emergency fund first), the rest for the month.
function salaryPlan(snapshot, today, income, prefs = {}) {
  const amount = num(income);
  const until = addDays(today, 31);
  const commitments = upcomingCommitments(snapshot, today, until);
  const sum = (kind) => commitments.filter(c => c.kind === kind).reduce((s, c) => s + c.amount, 0);
  const lines = [];
  const push = (key, label, value) => { if (value > 0) lines.push({ key, label, amount: round(value, 10) }); };
  push('rent', { pt: 'Renda / casa', en: 'Rent / home' }, sum('rent'));
  push('xitique', { pt: 'Xitique', en: 'Xitique' }, sum('xitique'));
  push('debt', { pt: 'Dívidas do mês', en: 'Debt payments' }, sum('debt'));
  const titheRate = prefs.titheRate === undefined ? null : num(prefs.titheRate);
  if (titheRate) push('tithe', { pt: 'Dízimo', en: 'Tithe' }, amount * titheRate);
  const used = lines.reduce((s, l) => s + l.amount, 0);
  const savingsRate = num(prefs.savingsRate) || 0.1;
  push('savings', { pt: 'Poupança', en: 'Savings' }, Math.max(0, Math.min(amount - used, amount * savingsRate)));
  const allocated = lines.reduce((s, l) => s + l.amount, 0);
  const free = round(amount - allocated, 10);
  return { income: round(amount), lines, free, perDay: round(free / 30, 10), short: free < 0 };
}

// ---------- unusual spending, recurring payments ----------

function unusualSpending(transactions, today) {
  const recentSince = addDays(today, -3);
  const historySince = addDays(today, -90);
  const out = [];
  for (const t of transactions) {
    if (!isExpense(t) || String(t.date) < recentSince || String(t.date) > today) continue;
    const amount = num(t.amount);
    if (amount < 1000) continue;
    const same = transactions.filter(o => o !== t && isExpense(o) && catKey(o.category) === catKey(t.category) && String(o.date) >= historySince && String(o.date) < recentSince).map(o => num(o.amount));
    if (same.length < 3) continue;
    const typical = median(same);
    if (typical > 0 && amount >= typical * 3) out.push({ tx: t, typical: round(typical), times: Math.round(amount / typical) });
  }
  return out;
}

function normalizeLabel(text) {
  return String(text || '').toLowerCase().replace(/\d+/g, ' ').replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 3).join(' ');
}

// Payments that repeat month after month with a similar amount (TV, internet,
// credit, subscriptions). Helps find what can be cut.
function detectRecurring(transactions, today) {
  const since = addDays(today, -120);
  const groups = new Map();
  for (const t of transactions) {
    if (!isExpense(t) || String(t.date) < since) continue;
    const label = normalizeLabel(t.description);
    if (!label) continue;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(t);
  }
  const out = [];
  for (const [label, list] of groups) {
    const months = new Set(list.map(t => monthOf(t.date)));
    if (months.size < 2) continue;
    const amounts = list.map(t => num(t.amount));
    const typical = median(amounts);
    if (!amounts.every(a => Math.abs(a - typical) <= typical * 0.2)) continue;
    out.push({ label, description: list[list.length - 1].description, category: list[0].category, amount: round(typical), months: months.size, yearly: round(typical * 12) });
  }
  return out.sort((a, b) => b.amount - a.amount).slice(0, 10);
}

// ---------- budgets ----------

function budgetAlerts(snapshot, today) {
  const [y, m, d] = today.split('-').map(Number);
  const left = daysInMonth(y, m) - d;
  const out = [];
  for (const b of snapshot.budgets || []) {
    const limit = num(b.limit_amount);
    const spent = num(b.spent);
    if (limit <= 0) continue;
    const pct = spent / limit;
    if (pct >= 1) out.push({ category: b.category, spent, limit, pct, left, over: true });
    else if (pct >= 0.8 && left >= 5) out.push({ category: b.category, spent, limit, pct, left, over: false });
  }
  return out.sort((a, b) => b.pct - a.pct);
}

// ---------- goals ----------

function goalStatus(goal, today) {
  const target = num(goal.target_amount);
  const saved = num(goal.saved_amount);
  if (target <= 0 || saved >= target) return null;
  const deadline = goal.deadline ? String(goal.deadline).slice(0, 10) : null;
  const monthsLeft = deadline ? Math.max(1, Math.round(daysBetween(today, deadline) / 30)) : null;
  const neededPerMonth = monthsLeft ? round((target - saved) / monthsLeft, 10) : null;
  const planned = num(goal.monthly_saving);
  return { id: goal.id, name: goal.name, target, saved, deadline, monthsLeft, neededPerMonth, planned, behind: Boolean(neededPerMonth && planned && neededPerMonth > planned * 1.2) };
}

// ---------- debts ----------

function monthlyRate(d) {
  const r = num(d.interest_rate);
  return d.interest_period === 'annual' ? r / 12 : r;
}

// Months to be debt-free paying `budget` per month in total. avalanche = most
// expensive interest first; snowball = smallest balance first.
function simulateDebtPayoff(debts, budget, strategy = 'avalanche') {
  let list = (debts || []).filter(d => num(d.remaining_amount) > 0).map(d => ({
    id: d.id, name: d.creditor_name, balance: num(d.remaining_amount), rate: monthlyRate(d), min: Math.min(num(d.remaining_amount), num(d.monthly_payment) || 0),
  }));
  if (!list.length) return { strategy, months: 0, totalInterest: 0, order: [], feasible: true };
  const minTotal = list.reduce((s, d) => s + d.min, 0);
  const pay = Math.max(num(budget), minTotal);
  if (pay <= 0) return { strategy, months: null, totalInterest: null, order: [], feasible: false, minTotal: round(minTotal) };
  const sorter = strategy === 'snowball' ? (a, b) => a.balance - b.balance : (a, b) => b.rate - a.rate || a.balance - b.balance;
  const order = [];
  let totalInterest = 0;
  let month = 0;
  while (list.length && month < 600) {
    month += 1;
    for (const d of list) { const interest = d.balance * d.rate; d.balance += interest; totalInterest += interest; }
    let left = pay;
    for (const d of list) { const p = Math.min(d.min, d.balance, left); d.balance -= p; left -= p; }
    for (const d of [...list].sort(sorter)) { if (left <= 0) break; const p = Math.min(d.balance, left); d.balance -= p; left -= p; }
    for (const d of list.filter(x => x.balance <= 0.5)) order.push({ id: d.id, name: d.name, paidOffMonth: month });
    list = list.filter(d => d.balance > 0.5);
    if (month > 1 && left >= pay - 0.01 && list.length) break; // interest grows faster than payments
  }
  const feasible = list.length === 0;
  return { strategy, monthlyPayment: round(pay), months: feasible ? month : null, totalInterest: round(totalInterest), order, feasible, minTotal: round(minTotal) };
}

// ---------- emergency fund, essentials ----------

function essentialMonthly(transactions, today) {
  const since = addDays(today, -90);
  const recent = transactions.filter(t => isExpense(t) && String(t.date) >= since);
  const essentials = recent.filter(t => ESSENTIAL_HINT.test(catKey(t.category))).reduce((s, t) => s + num(t.amount), 0) / 3;
  if (essentials > 0) return round(essentials, 10);
  return round(recent.reduce((s, t) => s + num(t.amount), 0) / 3 * 0.7, 10);
}

function emergencyFundPlan(snapshot, today, { months = 3, monthly } = {}) {
  const essential = essentialMonthly(snapshot.transactions || [], today);
  const target = round(essential * months, 100);
  const savedGoal = (snapshot.goals || []).find(g => /emerg|reserva|imprevist/i.test(g.name || ''));
  const saved = savedGoal ? num(savedGoal.saved_amount) : 0;
  const gap = Math.max(0, target - saved);
  const income = monthlyIncome(snapshot.transactions || [], today, snapshot.payday);
  const suggested = round(monthly || Math.max(500, Math.min(gap, income * 0.1)), 50);
  return { essentialMonthly: essential, months, target, saved, gap, monthlySuggested: suggested, monthsToGoal: suggested > 0 ? Math.ceil(gap / suggested) : null, goalId: savedGoal?.id || null };
}

// ---------- monthly plan (envelopes) ----------

function monthlyPlan(snapshot, today, prefs = {}) {
  const tx = snapshot.transactions || [];
  const payday = snapshot.payday ?? detectPayday(tx, today);
  const income = monthlyIncome(tx, today, payday);
  const since = addDays(today, -90);
  const byCat = new Map();
  for (const t of tx) {
    if (!isExpense(t) || String(t.date) < since) continue;
    const k = t.category || 'other';
    byCat.set(k, (byCat.get(k) || 0) + num(t.amount));
  }
  const commitments = upcomingCommitments(snapshot, today, addDays(today, 31)).reduce((s, c) => s + c.amount, 0);
  const tithe = prefs.titheRate ? income * num(prefs.titheRate) : 0;
  const savings = income * (num(prefs.savingsRate) || 0.1);
  const available = Math.max(0, income - commitments - tithe - savings);
  const avg = [...byCat.entries()].map(([category, total]) => ({ category, avg: total / 3 })).filter(e => !COMMITMENT_HINT.test(catKey(e.category)) && e.avg >= 50);
  const avgTotal = avg.reduce((s, e) => s + e.avg, 0);
  const scale = avgTotal > available && avgTotal > 0 ? available / avgTotal : 1;
  const envelopes = avg.map(e => ({ category: e.category, average: round(e.avg, 10), limit: round(e.avg * scale, 50) })).filter(e => e.limit > 0).sort((a, b) => b.limit - a.limit).slice(0, 8);
  return { income: round(income, 10), commitments: round(commitments, 10), tithe: round(tithe, 10), savings: round(savings, 10), available: round(available, 10), envelopes, tight: scale < 1 };
}

// ---------- credit readiness ----------

function creditReadiness(snapshot, today) {
  const tx = snapshot.transactions || [];
  const payday = snapshot.payday ?? detectPayday(tx, today);
  const income = monthlyIncome(tx, today, payday);
  const debtService = (snapshot.debts || []).reduce((s, d) => s + Math.min(num(d.remaining_amount), num(d.monthly_payment)), 0);
  const ratio = income > 0 ? debtService / income : 1;
  const months = new Set(tx.map(t => monthOf(t.date))).size;
  const essential = essentialMonthly(tx, today);
  const buffer = essential > 0 ? num(snapshot.balance) / essential : 0;
  const overdue = (snapshot.debts || []).some(d => d.due_date && String(d.due_date).slice(0, 10) < today && num(d.remaining_amount) > 0);
  const checks = [
    { key: 'stable_income', ok: Boolean(payday && payday.confidence !== 'low') },
    { key: 'history', ok: months >= 3, value: months },
    { key: 'debt_ratio', ok: ratio <= 0.35, value: Math.round(ratio * 100) },
    { key: 'buffer', ok: buffer >= 1, value: Number(buffer.toFixed(1)) },
    { key: 'no_overdue', ok: !overdue },
  ];
  const passed = checks.filter(c => c.ok).length;
  return {
    ready: passed === checks.length,
    score: Math.round((passed / checks.length) * 100),
    income: round(income, 10),
    currentInstalments: round(debtService, 10),
    maxNewInstalment: round(Math.max(0, income * 0.35 - debtService), 50),
    checks,
  };
}

// ---------- weekly summary, month close ----------

function weeklySummary(snapshot, today) {
  const tx = snapshot.transactions || [];
  const sum = (from, to) => tx.filter(t => isExpense(t) && String(t.date) >= from && String(t.date) < to).reduce((s, t) => s + num(t.amount), 0);
  const thisWeek = sum(addDays(today, -6), addDays(today, 1));
  const lastWeek = sum(addDays(today, -13), addDays(today, -6));
  const cats = new Map();
  for (const t of tx) if (isExpense(t) && String(t.date) >= addDays(today, -6) && String(t.date) <= today) cats.set(t.category || 'other', (cats.get(t.category || 'other') || 0) + num(t.amount));
  const top = [...cats.entries()].sort((a, b) => b[1] - a[1])[0];
  const daily = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    daily.push({ date: day, spent: round(sum(day, addDays(day, 1))) });
  }
  return { from: addDays(today, -6), to: today, spent: round(thisWeek), previous: round(lastWeek), change: lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null, topCategory: top ? { category: top[0], amount: round(top[1]) } : null, daily };
}

function monthClose(snapshot, month) {
  const tx = snapshot.transactions || [];
  const prevMonth = monthOf(addMonths(`${month}-01`, -1));
  const inMonth = (t, m) => monthOf(t.date) === m;
  const total = (m, f) => tx.filter(t => inMonth(t, m) && f(t)).reduce((s, t) => s + num(t.amount), 0);
  const income = total(month, isIncome);
  const expenses = total(month, isExpense);
  const catTotals = (m) => { const map = new Map(); for (const t of tx) if (inMonth(t, m) && isExpense(t)) map.set(t.category || 'other', (map.get(t.category || 'other') || 0) + num(t.amount)); return map; };
  const now = catTotals(month);
  const before = catTotals(prevMonth);
  let highlight = null;
  for (const [cat, prev] of before) {
    const cur = now.get(cat) || 0;
    const drop = prev - cur;
    if (drop > 0 && (!highlight || drop > highlight.saved)) highlight = { category: cat, saved: round(drop) };
  }
  let challenge = null;
  for (const b of snapshot.budgets || []) {
    const spent = now.get(b.category) || 0;
    const over = spent - num(b.limit_amount);
    if (num(b.limit_amount) > 0 && over > 0 && (!challenge || over > challenge.over)) challenge = { category: b.category, over: round(over) };
  }
  if (!challenge) {
    let up = null;
    for (const [cat, cur] of now) { const rise = cur - (before.get(cat) || 0); if (rise > 0 && (!up || rise > up.over)) up = { category: cat, over: round(rise) }; }
    challenge = up;
  }
  const recurring = detectRecurring(tx, `${month}-28`);
  return { month, income: round(income), expenses: round(expenses), saved: round(income - expenses), savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : null, highlight, challenge, opportunity: recurring[0] || null };
}

// ---------- alerts ----------

const LABELS = {
  rent: { pt: 'renda', en: 'rent' },
  xitique: { pt: 'xitique', en: 'xitique' },
  debt: { pt: 'prestação', en: 'instalment' },
};

// Every alert the person could get today, most important first. Each one has a
// stable id (used to never send the same alert twice) and one action.
function buildAlerts(snapshot, today, lang = 'pt') {
  const en = lang === 'en';
  const alerts = [];
  const tx = snapshot.transactions || [];
  const payday = snapshot.payday ?? detectPayday(tx, today);
  const snap = { ...snapshot, payday };

  // 1. Salary arrived and no plan yet this month.
  if (payday) {
    const recent = tx.filter(t => isIncome(t) && String(t.date) >= addDays(today, -2) && num(t.amount) >= payday.amount * 0.6);
    const planned = (snapshot.plans || []).some(p => p.kind === 'salary' && monthOf(p.created_at || '') === monthOf(today));
    if (recent.length && !planned) {
      const income = recent.reduce((s, t) => s + num(t.amount), 0);
      const plan = salaryPlan(snap, today, income, snapshot.prefs);
      alerts.push({
        id: `salary:${monthOf(today)}`, kind: 'salary_plan', priority: 1,
        title: en ? `${money(income, lang)} came in` : `Entraram ${money(income, lang)}`,
        body: en
          ? `Shall we split it now? ${plan.lines.map(l => `${l.label.en} ${money(l.amount, lang)}`).join(', ')}; ${money(plan.free, lang)} left for the month.`
          : `Dividimos já? ${plan.lines.map(l => `${l.label.pt} ${money(l.amount, lang)}`).join(', ')}; ficam ${money(plan.free, lang)} para o mês.`,
        action: { type: 'salary_plan', label: en ? 'See the plan' : 'Ver o plano', to: '/plano?salario=1' },
        data: plan,
      });
    }
  }

  // 2. Money runs out before payday.
  const forecast = forecastBalance(snap, today);
  if (forecast.runoutDate && forecast.runoutDate < forecast.horizon) {
    alerts.push({
      id: `runout:${forecast.runoutDate}`, kind: 'runout', priority: 1,
      title: en ? `Money runs out on ${shortDate(forecast.runoutDate, lang)}` : `O saldo acaba a ${shortDate(forecast.runoutDate, lang)}`,
      body: forecast.horizonIsPayday
        ? (en ? `At this pace the balance runs out before payday (${shortDate(forecast.horizon, lang)}). Cutting about ${money(forecast.cutPerDay, lang)} a day fixes it.` : `Ao ritmo actual o saldo acaba antes do salário (${shortDate(forecast.horizon, lang)}). Cortar cerca de ${money(forecast.cutPerDay, lang)} por dia resolve.`)
        : (en ? `At this pace the balance runs out in ${daysBetween(today, forecast.runoutDate)} days.` : `Ao ritmo actual o saldo acaba daqui a ${daysBetween(today, forecast.runoutDate)} dias.`),
      action: { type: 'open', label: en ? 'Where to cut' : 'Onde cortar', to: '/plano' },
      data: { runoutDate: forecast.runoutDate, horizon: forecast.horizon, cutPerDay: forecast.cutPerDay },
    });
  }

  // 3. Payments due in the next 3 days (or overdue).
  for (const c of upcomingCommitments(snap, today, addDays(today, 3))) {
    const what = LABELS[c.kind][lang] || LABELS[c.kind].pt;
    const when = c.overdue ? (en ? 'is overdue' : 'está em atraso') : c.date === today ? (en ? 'is due today' : 'vence hoje') : (en ? `is due ${shortDate(c.date, lang)}` : `vence a ${shortDate(c.date, lang)}`);
    const action = c.kind === 'xitique'
      ? { type: 'proposal', label: en ? 'Mark as paid' : 'Marcar como pago', proposal: { action: 'pay_xitique', payload: { contributionId: c.ref.contributionId }, amount: c.amount, name: c.label, dueDate: c.date } }
      : c.kind === 'debt'
        ? { type: 'proposal', label: en ? 'Record payment' : 'Registar pagamento', proposal: { action: 'pay_debt', payload: { debtId: c.ref.debtId, amount: c.amount }, creditor: c.label, remainingAfter: null } }
        : { type: 'open', label: en ? 'Open' : 'Abrir', to: '/habitacao' };
    alerts.push({
      id: `due:${c.id}:${c.date}`, kind: 'due', priority: c.overdue || c.date === today ? 1 : 2,
      title: en ? `${what[0].toUpperCase()}${what.slice(1)} ${when}` : `${what[0].toUpperCase()}${what.slice(1)} ${when}`,
      body: `${c.label ? `${c.label}: ` : ''}${money(c.amount, lang)}.`,
      action,
      data: c,
    });
  }

  // 4. Budget at 80% or over.
  for (const b of budgetAlerts(snap, today).slice(0, 2)) {
    alerts.push({
      id: `budget:${b.category}:${monthOf(today)}:${b.over ? 'over' : '80'}`, kind: 'budget', priority: b.over ? 2 : 3,
      title: b.over
        ? (en ? `${catLabel(b.category, lang)} budget exceeded` : `Orçamento de ${catLabel(b.category, lang)} ultrapassado`)
        : (en ? `${catLabel(b.category, lang)} is at ${Math.round(b.pct * 100)}%` : `${catLabel(b.category, lang)} já vai em ${Math.round(b.pct * 100)}%`),
      body: en ? `${money(b.spent, lang)} of ${money(b.limit, lang)}, ${b.left} days left this month.` : `${money(b.spent, lang)} de ${money(b.limit, lang)}, faltam ${b.left} dias para o fim do mês.`,
      action: { type: 'open', label: en ? 'Adjust' : 'Ajustar', to: '/orcamento' },
      data: b,
    });
  }

  // 5. Unusual spending.
  for (const u of unusualSpending(tx, today).slice(0, 1)) {
    alerts.push({
      id: `unusual:${u.tx.id || `${u.tx.date}-${u.tx.amount}`}`, kind: 'unusual', priority: 2,
      title: en ? 'Unusual expense' : 'Gasto fora do normal',
      body: en
        ? `${money(u.tx.amount, lang)} in ${catLabel(u.tx.category, lang)} (${u.tx.description || ''}), ${u.times} times the usual. Is it right?`
        : `${money(u.tx.amount, lang)} em ${catLabel(u.tx.category, lang)} (${u.tx.description || ''}), ${u.times} vezes o habitual. Está certo?`,
      action: { type: 'open', label: en ? 'Check' : 'Verificar', to: '/transacoes' },
      data: { id: u.tx.id, typical: u.typical },
    });
  }

  // 6. Goal falling behind.
  for (const g of (snapshot.goals || []).map(goal => goalStatus(goal, today)).filter(s => s && s.behind).slice(0, 1)) {
    const extra = Math.max(0, g.neededPerMonth - g.planned);
    alerts.push({
      id: `goal:${g.id}:${monthOf(today)}`, kind: 'goal', priority: 3,
      title: en ? `Goal "${g.name}" is behind` : `A meta "${g.name}" está atrasada`,
      body: en ? `To reach it by ${shortDate(g.deadline, lang)} you need ${money(g.neededPerMonth, lang)} a month.` : `Para chegar a tempo (${shortDate(g.deadline, lang)}) precisas de ${money(g.neededPerMonth, lang)} por mês.`,
      action: { type: 'proposal', label: en ? `Add ${money(extra, lang)}` : `Reforçar ${money(extra, lang)}`, proposal: { action: 'goal_topup', payload: { goalId: g.id, amount: round(extra, 50) }, name: g.name } },
      data: g,
    });
  }

  return alerts.sort((a, b) => a.priority - b.priority);
}

// Which alerts reach the person, by the initiative level they chose.
const LEVEL_MAX_PRIORITY = { discreet: 1, normal: 2, close: 3 };
function alertsForLevel(alerts, level = 'normal') {
  const max = LEVEL_MAX_PRIORITY[level] ?? 2;
  return alerts.filter(a => a.priority <= max);
}

module.exports = {
  todayMz, hourMz, weekdayMz, addDays, addMonths, daysBetween, monthOf, money, catLabel,
  detectPayday, nextPayday, dailySpend, monthlyIncome, upcomingCommitments,
  forecastBalance, salaryPlan, unusualSpending, detectRecurring, budgetAlerts, goalStatus,
  simulateDebtPayoff, essentialMonthly, emergencyFundPlan, monthlyPlan, creditReadiness,
  weeklySummary, monthClose, buildAlerts, alertsForLevel, LEVEL_MAX_PRIORITY,
};
