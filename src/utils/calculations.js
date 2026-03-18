// Financial calculation utilities shared across the app.

export function fmt(n, currency = 'MT') {
  return Number(n || 0).toLocaleString('pt-MZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }) + ' ' + currency;
}

export function fmtShort(n, currency = 'MT') {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M ' + currency;
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + 'k ' + currency;
  return fmt(n, currency);
}

export function fmtPercent(n) {
  return Math.round(n) + '%';
}

export function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function getFinancialMonthKey(dateStr, startDay = 1) {
  if (!dateStr) return '0000-00';
  const date = new Date(dateStr);

  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();

  let targetY = y;
  let targetM = m;

  if (startDay > 1 && d >= startDay) {
    targetM += 1;
    if (targetM > 11) {
      targetM = 0;
      targetY += 1;
    }
  }

  return `${targetY}-${String(targetM + 1).padStart(2, '0')}`;
}

export function getMonthLabel(key) {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const [y, m] = key.split('-');
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

export function getCurrentMonthLabel() {
  return getMonthLabel(getMonthKey());
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isHousingTransaction(transaction) {
  const tipo = normalizeText(transaction?.tipo);
  const category = normalizeText(transaction?.cat);
  const description = normalizeText(transaction?.desc);

  return (
    tipo === 'renda' ||
    category === 'renda' ||
    category === 'habitacao' ||
    description.startsWith('renda:') ||
    description.startsWith('aluguer:') ||
    description.startsWith('prestacao:')
  );
}

function getUnlinkedPaidRentals(rendas = [], transactions = [], startDay = 1) {
  const paidRentals = rendas
    .filter(r => r?.estado === 'pago' && r?.mes && Number(r?.valor || 0) > 0)
    .sort((a, b) => a.mes.localeCompare(b.mes));

  const housingTransactions = transactions
    .filter(t => t?.data && Number(t?.valor || 0) > 0 && isHousingTransaction(t))
    .map((transaction, index) => ({ transaction, index }));

  const used = new Set();

  return paidRentals.filter((rental) => {
    const match = housingTransactions.find(({ transaction, index }) => {
      if (used.has(index)) return false;
      if (getFinancialMonthKey(transaction.data, startDay) !== rental.mes) return false;
      return Number(transaction.valor || 0) === Number(rental.valor || 0);
    });

    if (!match) return true;

    used.add(match.index);
    return false;
  });
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function calcHousingMonthlyTotal(transactions, monthKey = getMonthKey(), rendas = [], startDay = 1) {
  const linkedHousing = transactions
    .filter(t => t.data && getFinancialMonthKey(t.data, startDay) === monthKey && isHousingTransaction(t))
    .reduce((sum, transaction) => sum + Number(transaction.valor || 0), 0);

  const fallbackHousing = getUnlinkedPaidRentals(rendas, transactions, startDay)
    .filter(rental => rental.mes === monthKey)
    .reduce((sum, rental) => sum + Number(rental.valor || 0), 0);

  return linkedHousing + fallbackHousing;
}

export function calcMonthlyTotals(transactions, monthKey = getMonthKey(), rendas = [], startDay = 1) {
  const monthTx = transactions.filter(t => t.data && getFinancialMonthKey(t.data, startDay) === monthKey);
  const receitas = monthTx.filter(t => t.tipo === 'receita').reduce((sum, t) => sum + Number(t.valor || 0), 0);
  const despesas = monthTx.filter(t => t.tipo === 'despesa').reduce((sum, t) => sum + Number(t.valor || 0), 0);
  const txRenda = monthTx.filter(t => t.tipo === 'renda').reduce((sum, t) => sum + Number(t.valor || 0), 0);
  const housingRenda = getUnlinkedPaidRentals(rendas, transactions, startDay)
    .filter(r => r.mes === monthKey)
    .reduce((sum, r) => sum + Number(r.valor || 0), 0);

  const renda = txRenda + housingRenda;
  const poupanca = monthTx.filter(t => t.tipo === 'poupanca').reduce((sum, t) => sum + Number(t.valor || 0), 0);
  const totalIncome = receitas;
  const totalExpenses = despesas + renda;
  const saldo = totalIncome - totalExpenses;

  return { receitas, despesas, renda, poupanca, totalIncome, saldo, totalExpenses };
}

export function calcCategoryBreakdown(transactions, tipo = 'despesa', monthKey = null, rendas = [], startDay = 1) {
  let filtered = transactions.filter(t => t.tipo === tipo);
  if (monthKey) {
    filtered = filtered.filter(t => t.data && getFinancialMonthKey(t.data, startDay) === monthKey);
  }

  const map = {};
  filtered.forEach(t => {
    const category = t.cat || 'Sem categoria';
    map[category] = (map[category] || 0) + Number(t.valor || 0);
  });

  if (tipo === 'despesa' || tipo === 'renda') {
    const housingFiltered = getUnlinkedPaidRentals(rendas, transactions, startDay);
    const monthHousing = monthKey ? housingFiltered.filter(r => r.mes === monthKey) : housingFiltered;
    const housingTotal = monthHousing.reduce((sum, rental) => sum + Number(rental.valor || 0), 0);
    if (housingTotal > 0) {
      map['Habitação'] = (map['Habitação'] || 0) + housingTotal;
    }
  }

  const total = Object.values(map).reduce((sum, value) => sum + value, 0) || 1;
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount,
      percent: Math.round((amount / total) * 100)
    }));
}

export function calcMonthlyHistory(transactions, rendas = [], startDay = 1) {
  const monthly = {};

  transactions.forEach(t => {
    const m = getFinancialMonthKey(t.data, startDay);
    if (!m || m === '0000-00') return;
    if (!monthly[m]) monthly[m] = { receitas: 0, despesas: 0, renda: 0, poupanca: 0 };

    if (t.tipo === 'receita') monthly[m].receitas += Number(t.valor || 0);
    if (t.tipo === 'despesa') monthly[m].despesas += Number(t.valor || 0);
    if (t.tipo === 'renda') monthly[m].renda += Number(t.valor || 0);
    if (t.tipo === 'poupanca') monthly[m].poupanca += Number(t.valor || 0);
  });

  getUnlinkedPaidRentals(rendas, transactions, startDay).forEach(r => {
    const m = r.mes;
    if (!monthly[m]) monthly[m] = { receitas: 0, despesas: 0, renda: 0, poupanca: 0 };
    monthly[m].renda += Number(r.valor || 0);
  });

  return Object.entries(monthly)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, data]) => ({
      month,
      label: getMonthLabel(month),
      ...data,
      totalIncome: data.receitas,
      totalExpenses: data.despesas + data.renda,
      saldo: data.receitas - (data.despesas + data.renda)
    }));
}

export function calcSavingsRate(totalIncome, despesas) {
  if (totalIncome <= 0) return 0;
  return Math.round(((totalIncome - despesas) / totalIncome) * 100);
}

export function calcFinancialScore(transactions, budgets = [], monthKey = getMonthKey(), rendas = [], startDay = 1) {
  const tot = calcMonthlyTotals(transactions, monthKey, rendas, startDay);
  let score = 50;

  const savingsRate = calcSavingsRate(tot.totalIncome, tot.totalExpenses);
  if (savingsRate >= 30) score += 30;
  else if (savingsRate >= 20) score += 25;
  else if (savingsRate >= 10) score += 15;
  else if (savingsRate >= 0) score += 5;
  else score -= 20;

  if (tot.renda > 0 && tot.receitas > 0) score += 10;
  else if (tot.totalIncome > 0) score += 5;

  if (budgets.length > 0) {
    const cats = calcCategoryBreakdown(transactions, 'despesa', monthKey, rendas, startDay);
    let withinBudget = 0;
    budgets.forEach(budget => {
      const category = cats.find(c => c.category === budget.category);
      if (!category || category.amount <= budget.limit) withinBudget += 1;
    });
    score += Math.round((withinBudget / budgets.length) * 10);
  }

  return Math.max(0, Math.min(100, score));
}

export function calcRiskLevel(score) {
  if (score >= 70) return { level: 'Baixo', color: 'var(--color-leaf)', emoji: '🟢' };
  if (score >= 40) return { level: 'Médio', color: 'var(--color-gold)', emoji: '🟡' };
  return { level: 'Alto', color: 'var(--color-coral)', emoji: '🔴' };
}

export function calcCompoundInterest(principal, monthlyContribution, annualRate, years) {
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  const points = [];
  let balance = principal;

  for (let m = 0; m <= months; m += 1) {
    points.push({
      month: m,
      year: (m / 12).toFixed(1),
      balance: Math.round(balance),
      invested: Math.round(principal + monthlyContribution * m)
    });
    balance = balance * (1 + monthlyRate) + monthlyContribution;
  }

  return points;
}

export function calcMonthlySavingsNeeded(targetAmount, currentSaved, deadlineDate) {
  const days = daysUntil(deadlineDate);
  if (!days || days <= 0) return null;

  const months = Math.max(1, Math.ceil(days / 30));
  const remaining = targetAmount - currentSaved;
  if (remaining <= 0) return 0;

  return Math.ceil(remaining / months);
}

export function exportToCSV(transactions, filename = 'mwanga_transacoes.csv') {
  const headers = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (MT)', 'Notas'];
  const rows = transactions.map(t => [t.data, t.tipo, t.cat, t.desc, t.valor, t.nota || '']);
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function generateDemoData() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const pm = String(now.getMonth()).padStart(2, '0') || '12';
  const py = now.getMonth() === 0 ? y - 1 : y;
  const dm = `${y}-${m}`;
  const pdm = `${py}-${pm}`;

  return {
    transacoes: [
      { id: 1, data: `${dm}-01`, tipo: 'receita', desc: 'Salário - ACTED', valor: 85000, cat: 'Salário', nota: 'Transferência bancária' },
      { id: 2, data: `${dm}-01`, tipo: 'renda', desc: 'Renda Pemba - Sr. Manuel', valor: 15000, cat: 'Habitação', nota: 'M-Pesa' },
      { id: 3, data: `${dm}-03`, tipo: 'despesa', desc: 'Supermercado Shoprite', valor: 12500, cat: 'Alimentação', nota: '' },
      { id: 4, data: `${dm}-05`, tipo: 'despesa', desc: 'Combustível (gasolina)', valor: 4500, cat: 'Transporte', nota: '' },
      { id: 5, data: `${dm}-07`, tipo: 'despesa', desc: 'Conta de energia (EDM)', valor: 2800, cat: 'Energia/Água', nota: '' },
      { id: 6, data: `${dm}-08`, tipo: 'despesa', desc: 'Internet Vodacom', valor: 1500, cat: 'Internet', nota: 'Pacote mensal' },
      { id: 7, data: `${dm}-10`, tipo: 'despesa', desc: 'Dízimo & ofertas', valor: 8500, cat: 'Igreja/Doações', nota: '' },
      { id: 8, data: `${dm}-12`, tipo: 'despesa', desc: 'Consulta médica', valor: 3000, cat: 'Saúde', nota: 'Clínica do Polana' },
      { id: 9, data: `${dm}-14`, tipo: 'despesa', desc: 'Jantar no restaurante', valor: 2500, cat: 'Lazer', nota: '' },
      { id: 10, data: `${dm}-15`, tipo: 'poupanca', desc: 'Poupança mensal', valor: 10000, cat: 'Poupança', nota: 'Conta poupança BCI' },
      { id: 11, data: `${dm}-18`, tipo: 'despesa', desc: 'Mercado local', valor: 5000, cat: 'Alimentação', nota: '' },
      { id: 101, data: `${pdm}-01`, tipo: 'receita', desc: 'Salário - ACTED', valor: 85000, cat: 'Salário', nota: '' },
      { id: 102, data: `${pdm}-01`, tipo: 'renda', desc: 'Renda - Júlia Santos', valor: 15000, cat: 'Renda Casa', nota: '' },
      { id: 103, data: `${pdm}-05`, tipo: 'despesa', desc: 'Supermercado', valor: 14000, cat: 'Alimentação', nota: '' },
      { id: 104, data: `${pdm}-08`, tipo: 'despesa', desc: 'Combustível', valor: 5000, cat: 'Transporte', nota: '' },
      { id: 105, data: `${pdm}-10`, tipo: 'despesa', desc: 'Contas (energia + água)', valor: 3500, cat: 'Energia/Água', nota: '' },
      { id: 106, data: `${pdm}-15`, tipo: 'poupanca', desc: 'Poupança mensal', valor: 8000, cat: 'Poupança', nota: '' },
      { id: 107, data: `${pdm}-12`, tipo: 'despesa', desc: 'Dízimo & ofertas', valor: 8500, cat: 'Igreja/Doações', nota: '' }
    ],
    rendas: [
      { id: 10, mes: dm, landlord: 'Sr. Manuel', valor: 15000, estado: 'pago', obs: 'Pago via M-Pesa no dia 1' },
      { id: 11, mes: pdm, landlord: 'Sr. Manuel', valor: 15000, estado: 'pago', obs: 'Pago via M-Pesa' }
    ],
    metas: [
      { id: 20, nome: 'Fundo de Emergência (6 meses)', alvo: 300000, poupado: 65000, prazo: `${y + 1}-06-01` },
      { id: 21, nome: 'Compra de Terreno em Pemba', alvo: 500000, poupado: 80000, prazo: `${y + 2}-01-01` },
      { id: 22, nome: 'Viagem de Lua de Mel', alvo: 120000, poupado: 35000, prazo: `${y}-12-15` }
    ],
    budgets: [
      { id: 1, category: 'Alimentação', limit: 20000 },
      { id: 2, category: 'Transporte', limit: 6000 },
      { id: 3, category: 'Energia/Água', limit: 4000 },
      { id: 4, category: 'Internet', limit: 2000 },
      { id: 5, category: 'Lazer', limit: 5000 },
      { id: 6, category: 'Saúde', limit: 5000 },
      { id: 7, category: 'Igreja/Doações', limit: 10000 }
    ]
  };
}
