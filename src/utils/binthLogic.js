import { calcMonthlyTotals, calcCategoryBreakdown, getFinancialMonthKey } from './calculations';

export function generateLocalBinthInsight(state, page) {
  const { transacoes, budgets, rendas, settings } = state;
  const startDay = settings.financial_month_start_day || 1;
  const now = new Date();
  const currentMonthKey = getFinancialMonthKey(now.toISOString(), startDay);
  
  const totals = calcMonthlyTotals(transacoes, currentMonthKey, rendas, startDay);
  const categories = calcCategoryBreakdown(transacoes, 'despesa', currentMonthKey, rendas, startDay);
  
  // Base default insight
  let insight = {
    insight_type: 'info',
    message: 'Estou a analisar os teus dados para te dar as melhores dicas.',
    alerta: null,
    biblical_insight: 'Os planos bem elaborados levam à fartura; mas o apressado sempre acaba na miséria. (Provérbios 21:5)',
    quick_actions: []
  };

  if (page === 'dashboard') {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const todayDay = now.getDate();
    const daysPassed = todayDay >= startDay ? todayDay - startDay + 1 : (daysInMonth - startDay + todayDay + 1);
    const burnRate = totals.totalExpenses / Math.max(daysPassed, 1);
    const expectedExpensesEnd = burnRate * daysInMonth;
    const topCategory = categories[0] || null;
    const budgetWarnings = (budgets || []).map((b) => ({
      ...b,
      spent: categories.find((c) => c.category === b.category)?.amount || 0,
      pct: b.limit > 0 ? (categories.find((c) => c.category === b.category)?.amount || 0) / b.limit : 0
    }));
    const overBudget = budgetWarnings.find((b) => b.spent > b.limit);
    const nearBudget = budgetWarnings.find((b) => b.pct >= 0.85 && b.pct <= 1);

    if (daysPassed > 5 && totals.totalIncome > 0 && expectedExpensesEnd > totals.totalIncome * 0.95) {
      return {
        insight_type: 'warning',
        message: `Com base na tua velocidade de gasto, podes usar quase tudo o que ganhas até ao fim do mês. Reduz as saídas não essenciais hoje.`,
        alerta: 'A velocidade de gasto está alta.',
        biblical_insight: 'Quem planeja com cuidado evita a escassez. (Provérbios 21:5)',
        quick_actions: ['Rever Orçamento', 'Ver Despesas']
      };
    }

    if (overBudget) {
      return {
        insight_type: 'warning',
        message: `Já ultrapassaste o orçamento de ${overBudget.category}: gastaste ${Math.round(overBudget.spent)} MT de ${Math.round(overBudget.limit)} MT. Ajusta já essa categoria.`,
        alerta: 'Orçamento estourado!',
        biblical_insight: 'O gestor prudente ajusta o curso quando percebe que ultrapassou o limite.',
        quick_actions: ['Ajustar Orçamento', 'Ver Despesas']
      };
    }

    if (nearBudget) {
      return {
        insight_type: 'action',
        message: `Atenção: ${nearBudget.category} já está em ${Math.round(nearBudget.pct * 100)}% do limite. Segura nos próximos gastos dessa categoria.`,
        alerta: null,
        biblical_insight: 'O cuidado com os detalhes evita perdas maiores no futuro.',
        quick_actions: ['Abrir Orçamento', 'Ver Despesas']
      };
    }

    if (topCategory && totals.totalExpenses > 0 && topCategory.amount > totals.totalExpenses * 0.35) {
      return {
        insight_type: 'opportunity',
        message: `A categoria com maior gasto é ${topCategory.category}. Reduzir essa linha em 15% pode melhorar claramente o teu saldo final.`,
        alerta: null,
        biblical_insight: 'Melhorar uma área crítica dá liberdade para o resto do plano.',
        quick_actions: ['Ver Despesas', 'Ajustar Orçamento']
      };
    }

    const income = totals.totalIncome;
    if (income > 0 && totals.poupanca >= income * 0.15) {
      return {
        insight_type: 'celebration',
        message: `Excelente progresso: já conseguiste poupar ${Math.round((totals.poupanca / income) * 100)}% da tua renda. Mantém este ritmo!`,
        alerta: null,
        biblical_insight: 'Guardar com sabedoria cria espaço para futuras bênçãos.',
        quick_actions: ['Ver Metas', 'Ver Orçamento']
      };
    }

    if (totals.totalExpenses === 0 && totals.totalIncome > 0) {
      return {
        insight_type: 'opportunity',
        message: `Recebeste fundos este mês e ainda não registaste saídas. Aproveita para organizar um plano simples de despesas e poupança.`,
        alerta: null,
        biblical_insight: 'O primeiro passo para gerir bem é nomear cada moeda.',
        quick_actions: ['Adicionar Despesa', 'Criar Meta']
      };
    }

    return {
      insight_type: 'info',
      message: `A tua situação parece estável, mas o importante é continuar a apontar cada transação para manter o controlo.`,
      alerta: null,
      biblical_insight: 'A consistência nos registos constrói confiança financeira.',
      quick_actions: ['Adicionar Despesa', 'Ver Metas']
    };
  }

  return insight;
}
