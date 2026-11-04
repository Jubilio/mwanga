const rules = require('../advisorRules');

const TODAY = '2026-11-10';
const tx = (date, type, amount, category = 'food', description = '') => ({ id: `${date}-${amount}-${category}`, date, type, amount, category, description });

// Salary on the 25th for three months, and steady daily spending.
function salaryHistory() {
  const list = [
    tx('2026-08-25', 'receita', 30000, 'salary', 'Salário'),
    tx('2026-09-25', 'receita', 30000, 'salary', 'Salário'),
    tx('2026-10-24', 'receita', 30000, 'salary', 'Salário'),
  ];
  for (let i = 1; i <= 60; i += 1) list.push(tx(rules.addDays(TODAY, -i), 'despesa', 300, 'food', 'Mercado'));
  return list;
}

describe('dates', () => {
  test('addMonths keeps the day inside short months', () => {
    expect(rules.addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(rules.addMonths('2026-12-15', 1)).toBe('2027-01-15');
  });
  test('Maputo day and hour', () => {
    const now = new Date('2026-11-09T22:30:00Z'); // 00:30 on the 10th in Maputo
    expect(rules.todayMz(now)).toBe('2026-11-10');
    expect(rules.hourMz(now)).toBe(0);
  });
});

describe('detectPayday', () => {
  test('finds the salary day from repeated big incomes', () => {
    const p = rules.detectPayday(salaryHistory(), TODAY);
    expect(p.day).toBe(25);
    expect(p.amount).toBe(30000);
    expect(p.confidence).toBe('high');
  });
  test('no pattern when incomes land on scattered days', () => {
    const list = [tx('2026-08-02', 'receita', 5000), tx('2026-09-17', 'receita', 5000), tx('2026-10-28', 'receita', 5000)];
    expect(rules.detectPayday(list, TODAY)).toBeNull();
  });
  test('next payday rolls to next month after the day passed', () => {
    expect(rules.nextPayday('2026-11-10', { day: 25 })).toBe('2026-11-25');
    expect(rules.nextPayday('2026-11-26', { day: 25 })).toBe('2026-12-25');
    expect(rules.nextPayday('2026-02-10', { day: 31 })).toBe('2026-02-28');
  });
});

describe('forecastBalance', () => {
  test('flags the day the money runs out before payday', () => {
    const snapshot = { balance: 3000, transactions: salaryHistory(), xitiqueDue: [], rentDue: [], debts: [] };
    const f = rules.forecastBalance(snapshot, TODAY);
    expect(f.horizon).toBe('2026-11-25');
    expect(f.dailySpend).toBe(300);
    expect(f.runoutDate).toBe('2026-11-21'); // 3000 / 300 = 10 days at zero, below zero on day 11
    expect(f.cutPerDay).toBeGreaterThan(0);
  });
  test('commitments are subtracted on their day and not as daily spending', () => {
    const snapshot = { balance: 20000, transactions: salaryHistory(), xitiqueDue: [{ contributionId: 4, amount: 2000, due_date: '2026-11-12', name: 'Família' }], rentDue: [], debts: [] };
    const f = rules.forecastBalance(snapshot, TODAY);
    expect(f.commitments).toHaveLength(1);
    const day12 = f.days.find(d => d.date === '2026-11-12');
    expect(day12.balance).toBe(20000 - 600 - 2000);
    expect(f.runoutDate).toBeNull();
  });
});

describe('salaryPlan', () => {
  test('commitments, tithe and savings come first', () => {
    const snapshot = { transactions: [], xitiqueDue: [], rentDue: [{ id: 1, month: '2026-12', amount: 8000 }], debts: [] };
    const plan = rules.salaryPlan(snapshot, '2026-11-25', 30000, { titheRate: 0.1 });
    const by = Object.fromEntries(plan.lines.map(l => [l.key, l.amount]));
    expect(by.rent).toBe(8000);
    expect(by.tithe).toBe(3000);
    expect(by.savings).toBe(3000);
    expect(plan.free).toBe(16000);
    expect(plan.short).toBe(false);
  });
});

describe('simulateDebtPayoff', () => {
  const debts = [
    { id: 1, creditor_name: 'Banco', remaining_amount: 10000, monthly_payment: 1000, interest_rate: 0.05, interest_period: 'monthly' },
    { id: 2, creditor_name: 'Tio', remaining_amount: 2000, monthly_payment: 500, interest_rate: 0, interest_period: 'monthly' },
  ];
  test('avalanche pays the expensive debt first and costs less interest', () => {
    const a = rules.simulateDebtPayoff(debts, 3000, 'avalanche');
    const s = rules.simulateDebtPayoff(debts, 3000, 'snowball');
    expect(a.feasible).toBe(true);
    expect(s.order[0].name).toBe('Tio');
    expect(a.totalInterest).toBeLessThanOrEqual(s.totalInterest);
  });
  test('infeasible when interest outgrows the payment', () => {
    const big = [{ id: 1, creditor_name: 'Agiota', remaining_amount: 100000, monthly_payment: 0, interest_rate: 0.2, interest_period: 'monthly' }];
    const r = rules.simulateDebtPayoff(big, 1000);
    expect(r.feasible).toBe(false);
  });
});

describe('creditReadiness', () => {
  test('ready with stable salary, history, low debt and a buffer', () => {
    const snapshot = { balance: 60000, transactions: salaryHistory(), debts: [] };
    const r = rules.creditReadiness(snapshot, TODAY);
    expect(r.ready).toBe(true);
    expect(r.maxNewInstalment).toBeGreaterThan(0);
  });
  test('not ready with an overdue debt', () => {
    const snapshot = { balance: 60000, transactions: salaryHistory(), debts: [{ id: 1, remaining_amount: 5000, monthly_payment: 1000, due_date: '2026-10-01' }] };
    const r = rules.creditReadiness(snapshot, TODAY);
    expect(r.ready).toBe(false);
    expect(r.checks.find(c => c.key === 'no_overdue').ok).toBe(false);
  });
});

describe('monthlyPlan and emergency fund', () => {
  test('envelopes come from real spending and fit the income', () => {
    const plan = rules.monthlyPlan({ transactions: salaryHistory(), xitiqueDue: [], rentDue: [], debts: [] }, TODAY, {});
    expect(plan.envelopes[0].category).toBe('food');
    const total = plan.envelopes.reduce((s, e) => s + e.limit, 0);
    expect(total).toBeLessThanOrEqual(plan.available + 50);
  });
  test('emergency fund target is months of essentials', () => {
    const plan = rules.emergencyFundPlan({ transactions: salaryHistory(), goals: [] }, TODAY, { months: 3 });
    expect(plan.target).toBeGreaterThan(0);
    expect(plan.monthsToGoal).toBeGreaterThan(0);
  });
});

describe('alerts', () => {
  test('salary just arrived gives a priority 1 salary plan alert once per month', () => {
    const list = salaryHistory();
    list.push(tx('2026-11-09', 'receita', 30000, 'salary', 'Salário'));
    const snapshot = { balance: 40000, transactions: list, xitiqueDue: [], rentDue: [], debts: [], budgets: [], goals: [], plans: [] };
    const alerts = rules.buildAlerts(snapshot, TODAY, 'pt');
    expect(alerts[0].kind).toBe('salary_plan');
    expect(alerts[0].id).toBe('salary:2026-11');
    const planned = rules.buildAlerts({ ...snapshot, plans: [{ kind: 'salary', created_at: '2026-11-09' }] }, TODAY, 'pt');
    expect(planned.find(a => a.kind === 'salary_plan')).toBeUndefined();
  });
  test('xitique due tomorrow offers a pay proposal', () => {
    const snapshot = { balance: 40000, transactions: salaryHistory(), xitiqueDue: [{ contributionId: 9, amount: 1500, due_date: '2026-11-11', name: 'Amigas' }], rentDue: [], debts: [], budgets: [], goals: [], plans: [] };
    const due = rules.buildAlerts(snapshot, TODAY).find(a => a.kind === 'due');
    expect(due.priority).toBe(2);
    expect(due.action.proposal).toMatchObject({ action: 'pay_xitique', payload: { contributionId: 9 } });
  });
  test('levels filter by priority', () => {
    const alerts = [{ priority: 1 }, { priority: 2 }, { priority: 3 }];
    expect(rules.alertsForLevel(alerts, 'discreet')).toHaveLength(1);
    expect(rules.alertsForLevel(alerts, 'normal')).toHaveLength(2);
    expect(rules.alertsForLevel(alerts, 'close')).toHaveLength(3);
  });
  test('english text', () => {
    const snapshot = { balance: 3000, transactions: salaryHistory(), xitiqueDue: [], rentDue: [], debts: [], budgets: [], goals: [], plans: [] };
    const runout = rules.buildAlerts(snapshot, TODAY, 'en').find(a => a.kind === 'runout');
    expect(runout.title).toMatch(/Money runs out/);
  });
});

describe('weekly and month close', () => {
  test('weekly summary compares with the week before', () => {
    const w = rules.weeklySummary({ transactions: salaryHistory() }, TODAY);
    expect(w.spent).toBe(1800); // the last 7 days, today included (nothing spent today)
    expect(w.previous).toBe(2100);
    expect(w.change).toBe(-14);
    expect(w.daily).toHaveLength(7);
  });
  test('month close totals and highlight', () => {
    const list = [
      tx('2026-09-03', 'despesa', 5000, 'food'), tx('2026-10-03', 'despesa', 3000, 'food'),
      tx('2026-10-25', 'receita', 30000, 'salary'),
    ];
    const c = rules.monthClose({ transactions: list, budgets: [] }, '2026-10');
    expect(c.income).toBe(30000);
    expect(c.expenses).toBe(3000);
    expect(c.highlight).toEqual({ category: 'food', saved: 2000 });
  });
});
