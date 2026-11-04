const { db } = require('../../config/db');
const rules = require('./advisorRules');
const { loadSnapshot } = require('./advisorData');
const { getSettings } = require('./advisor.service');
const { parseAmount, CATEGORIES } = require('../binthActions');

// Advisor tools for the Binth chat. Read tools return numbers; propose tools
// prepare a card the person confirms in the app. Nothing here writes.

const MAX_AMOUNT = 1e9;
const validAmount = (v) => { const n = Math.round(parseAmount(v) * 100) / 100; return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT ? n : null; };

async function snapshotWithPrefs(householdId) {
  const today = rules.todayMz();
  const [snapshot, settings] = await Promise.all([loadSnapshot(householdId, null, today), getSettings(householdId)]);
  snapshot.prefs = { ...snapshot.prefs, titheRate: settings.titheRate ?? undefined, savingsRate: settings.savingsRate ?? undefined };
  return { snapshot, today };
}

// ---------- read tools ----------

async function forecastBalanceTool({ householdId }) {
  const { snapshot, today } = await snapshotWithPrefs(householdId);
  const f = rules.forecastBalance(snapshot, today);
  return { success: true, data: { today, until: f.horizon, untilIsPayday: f.horizonIsPayday, balanceNow: Math.round(snapshot.balance), endBalance: f.endBalance, runoutDate: f.runoutDate, averageDailySpend: f.dailySpend, cutPerDayToLast: f.cutPerDay, commitments: f.commitments.map(c => ({ kind: c.kind, date: c.date, amount: c.amount, label: c.label })) } };
}

async function recurringTool({ householdId }) {
  const { snapshot, today } = await snapshotWithPrefs(householdId);
  return { success: true, data: { recurring: rules.detectRecurring(snapshot.transactions, today) } };
}

async function debtPayoffTool({ householdId, monthlyBudget, strategy }) {
  const { snapshot } = await snapshotWithPrefs(householdId);
  const budget = Number(monthlyBudget) || 0;
  return { success: true, data: { avalanche: rules.simulateDebtPayoff(snapshot.debts, budget, 'avalanche'), snowball: rules.simulateDebtPayoff(snapshot.debts, budget, 'snowball'), preferred: strategy === 'snowball' ? 'snowball' : 'avalanche' } };
}

async function creditReadinessTool({ householdId }) {
  const { snapshot, today } = await snapshotWithPrefs(householdId);
  return { success: true, data: rules.creditReadiness(snapshot, today) };
}

// ---------- proposals ----------

async function proposeMonthlyPlan({ householdId }) {
  const { snapshot, today } = await snapshotWithPrefs(householdId);
  const plan = rules.monthlyPlan(snapshot, today, snapshot.prefs);
  if (!plan.envelopes.length) return { success: false, data: { error: 'Ainda não há despesas suficientes para propor envelopes. Pede ao utilizador para registar gastos durante algumas semanas.' } };
  return { success: true, proposal: { action: 'save_plan', payload: { kind: 'monthly', title: `Plano de ${rules.monthOf(today)}`, data: plan } }, data: { proposed: true } };
}

async function proposeDebtPlan({ householdId, monthlyBudget, strategy }) {
  const { snapshot } = await snapshotWithPrefs(householdId);
  if (!snapshot.debts.length) return { success: false, data: { error: 'Não há dívidas pendentes registadas.' } };
  const chosen = strategy === 'snowball' ? 'snowball' : 'avalanche';
  const sim = rules.simulateDebtPayoff(snapshot.debts, Number(monthlyBudget) || 0, chosen);
  if (!sim.feasible) return { success: false, data: { error: 'Com este valor por mês as dívidas não acabam. Pergunta quanto pode pagar por mês.', minimumPerMonth: sim.minTotal } };
  return { success: true, proposal: { action: 'save_plan', payload: { kind: 'debt', title: chosen === 'snowball' ? 'Sair das dívidas (mais pequena primeiro)' : 'Sair das dívidas (juro mais caro primeiro)', data: sim } }, data: { proposed: true } };
}

async function proposeEmergencyFund({ householdId, months, monthly }) {
  const { snapshot, today } = await snapshotWithPrefs(householdId);
  const plan = rules.emergencyFundPlan(snapshot, today, { months: Math.min(12, Math.max(1, Number(months) || 3)), monthly: Number(monthly) || undefined });
  if (!plan.target) return { success: false, data: { error: 'Ainda não há despesas registadas para calcular o fundo.' } };
  return { success: true, proposal: { action: 'save_plan', payload: { kind: 'emergency', title: `Fundo de emergência (${plan.months} meses)`, data: plan } }, data: { proposed: true } };
}

function proposeBudgetChange({ category, limit }) {
  const value = validAmount(limit);
  const cat = CATEGORIES.includes(category) ? category : null;
  if (!cat || !value) return { success: false, data: { error: 'Categoria ou valor inválido.' } };
  return { success: true, proposal: { action: 'set_budget', payload: { category: cat, limit: value } }, data: { proposed: true } };
}

function proposeGoal({ name, target, deadline, monthly }) {
  const value = validAmount(target);
  const title = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  if (!title || !value) return { success: false, data: { error: 'Nome ou valor da meta em falta.' } };
  const today = rules.todayMz();
  const end = /^\d{4}-\d{2}-\d{2}$/.test(String(deadline || '')) && deadline > today ? deadline : null;
  const months = end ? Math.max(1, Math.round(rules.daysBetween(today, end) / 30)) : null;
  const perMonth = validAmount(monthly) || (months ? Math.ceil(value / months / 50) * 50 : null);
  return { success: true, proposal: { action: 'add_goal', payload: { name: title, target: value, deadline: end, monthly: perMonth || 0 } }, data: { proposed: true } };
}

async function proposeGoalTopUp({ householdId, name, amount }) {
  const value = validAmount(amount);
  if (!value) return { success: false, data: { error: 'Valor inválido.' } };
  const res = await db.execute({ sql: 'SELECT id, name, target_amount, saved_amount FROM goals WHERE household_id = ?', args: [householdId] });
  const wanted = String(name || '').toLowerCase().trim();
  const open = (res.rows || []).filter(g => Number(g.saved_amount) < Number(g.target_amount));
  const matches = wanted ? open.filter(g => String(g.name).toLowerCase().includes(wanted)) : open;
  if (matches.length !== 1) return { success: false, data: { error: matches.length ? 'Mais de uma meta corresponde.' : 'Meta não encontrada.', goals: open.map(g => g.name) } };
  return { success: true, proposal: { action: 'goal_topup', payload: { goalId: matches[0].id, amount: value }, name: matches[0].name }, data: { proposed: true } };
}

function proposeReminder({ date, text }) {
  const today = rules.todayMz();
  const day = String(date || '').slice(0, 10);
  const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day)) || day < today || day > rules.addDays(today, 366) || !clean) return { success: false, data: { error: 'Data (AAAA-MM-DD, de hoje a um ano) ou texto em falta.' } };
  return { success: true, proposal: { action: 'reminder', payload: { date: day, text: clean } }, data: { proposed: true } };
}

function proposeRememberFact({ fact }) {
  const clean = String(fact || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!clean) return { success: false, data: { error: 'Facto vazio.' } };
  return { success: true, proposal: { action: 'remember', payload: { fact: clean } }, data: { proposed: true } };
}

// ---------- card text ----------

function advisorProposalMessage(proposal, language = 'pt') {
  const en = language === 'en';
  const m = (n) => rules.money(n, language);
  const p = proposal.payload || {};
  switch (proposal.action) {
    case 'save_plan': {
      const d = p.data || {};
      if (p.kind === 'monthly') {
        const lines = (d.envelopes || []).map(e => `- ${rules.catLabel(e.category, language)}: ${m(e.limit)}`).join('\n');
        return en
          ? `Here is a plan for this month. Income ${m(d.income)}, commitments ${m(d.commitments)}, savings ${m(d.savings)}. Envelopes:\n${lines}\nShall I save it and set these budgets?`
          : `Proponho este plano para o mês. Rendimento ${m(d.income)}, compromissos ${m(d.commitments)}, poupança ${m(d.savings)}. Envelopes:\n${lines}\nGuardo o plano e defino estes orçamentos?`;
      }
      if (p.kind === 'debt') {
        const order = (d.order || []).map((o, i) => `${i + 1}. ${o.name} (${en ? 'month' : 'mês'} ${o.paidOffMonth})`).join('\n');
        return en
          ? `Paying ${m(d.monthlyPayment)} a month, you are debt-free in ${d.months} months (interest ${m(d.totalInterest)}). Order:\n${order}\nSave this plan?`
          : `Pagando ${m(d.monthlyPayment)} por mês, ficas livre de dívidas em ${d.months} meses (juros ${m(d.totalInterest)}). Ordem:\n${order}\nGuardo este plano?`;
      }
      if (p.kind === 'emergency') {
        return en
          ? `Emergency fund: ${m(d.target)} (${d.months} months of essentials). Saving ${m(d.monthlySuggested)} a month, you get there in ${d.monthsToGoal} months. Save this plan?`
          : `Fundo de emergência: ${m(d.target)} (${d.months} meses de despesas essenciais). Poupando ${m(d.monthlySuggested)} por mês, chegas lá em ${d.monthsToGoal} meses. Guardo este plano?`;
      }
      return en ? `Save the plan "${p.title}"?` : `Guardo o plano "${p.title}"?`;
    }
    case 'set_budget':
      return en ? `Set the ${rules.catLabel(p.category, language)} budget to ${m(p.limit)} a month?` : `Defino o orçamento de ${rules.catLabel(p.category, language)} em ${m(p.limit)} por mês?`;
    case 'add_goal':
      return en
        ? `Create the goal **${p.name}**: ${m(p.target)}${p.deadline ? ` by ${p.deadline}` : ''}${p.monthly ? `, ${m(p.monthly)} a month` : ''}?`
        : `Crio a meta **${p.name}**: ${m(p.target)}${p.deadline ? ` até ${p.deadline}` : ''}${p.monthly ? `, ${m(p.monthly)} por mês` : ''}?`;
    case 'goal_topup':
      return en ? `Add ${m(p.amount)} to the goal **${proposal.name}**?` : `Reforço a meta **${proposal.name}** com ${m(p.amount)}?`;
    case 'reminder':
      return en ? `Remind you on ${p.date}: "${p.text}"?` : `Lembro-te a ${p.date}: "${p.text}"?`;
    case 'remember':
      return en ? `Shall I remember this? "${p.fact}" (you can delete it in Settings)` : `Queres que me lembre disto? "${p.fact}" (podes apagar nas Definições)`;
    default:
      return null;
  }
}

module.exports = {
  forecastBalanceTool, recurringTool, debtPayoffTool, creditReadinessTool,
  proposeMonthlyPlan, proposeDebtPlan, proposeEmergencyFund, proposeBudgetChange, proposeGoal, proposeGoalTopUp, proposeReminder, proposeRememberFact,
  advisorProposalMessage,
};
