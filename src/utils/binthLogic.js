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
    // 1. Check if user is burning cash too fast
    const daysInMonth = 30; // Approximation
    const todayDay = now.getDate();
    const daysPassed = todayDay >= startDay ? todayDay - startDay + 1 : (30 - startDay + todayDay + 1);
    
    // Check if expenses are disproportionate to the days passed 
    if (daysPassed > 3 && totals.totalIncome > 0) {
      const burnRate = totals.totalExpenses / daysPassed;
      const expectedExpensesEnd = burnRate * daysInMonth;
      
      if (expectedExpensesEnd > totals.totalIncome * 0.95) {
        return {
          insight_type: 'warning',
          message: `Estás a gastar em média ${Math.round(burnRate)} MT por dia. Se continuares assim, o teu saldo vai acabar antes do fim do mês!`,
          alerta: 'Velocidade de gastos alta detectada.',
          biblical_insight: 'O sábio poupa e tem sempre o suficiente, mas o tolo gasta tudo o que ganha. (Provérbios 21:20)',
          quick_actions: ['Rever Orçamento', 'Adicionar Meta']
        };
      }
    }

    // 2. Budget vs Categories Alerts
    if (budgets && budgets.length > 0) {
      for (let b of budgets) {
        const catSpent = categories.find(c => c.category === b.category)?.amount || 0;
        if (catSpent > b.limit) {
          return {
            insight_type: 'warning',
            message: `Já gastaste ${catSpent} MT em ${b.category}, ultrapassando o teu limite de ${b.limit} MT para este mês.`,
            alerta: 'Orçamento estourado!',
            biblical_insight: 'Não te deixes vencer pelas dívidas. (Provérbios 22:7)',
            quick_actions: ['Ajustar Orçamento']
          };
        } else if (catSpent > b.limit * 0.85) {
          return {
            insight_type: 'action',
            message: `Atenção: Já consumiste ${Math.round((catSpent/b.limit)*100)}% do teu orçamento para ${b.category}. Tem cuidado com os próximos gastos!`,
            alerta: null,
            biblical_insight: null,
            quick_actions: ['Ver Despesas']
          };
        }
      }
    }

    // 3. Positive reinforcement for savings
    const income = totals.totalIncome;
    if (income > 0 && totals.poupanca > income * 0.1) {
      return {
        insight_type: 'celebration',
        message: `Parabéns! Já poupaste mais de 10% da tua renda este mês. Estás no bom caminho.`,
        alerta: null,
        biblical_insight: 'A riqueza de procedência vã diminuirá, mas quem a ajunta com o próprio trabalho a aumentará. (Provérbios 13:11)',
        quick_actions: ['Ver Metas']
      };
    }
    
    // 4. Default proactive insight
    if (totals.totalExpenses === 0 && totals.totalIncome > 0) {
       return {
        insight_type: 'opportunity',
        message: `Recebeste fundos recentemente. É o momento ideal para dar um destino a cada metical: paga as despesas fixas e separa a poupança agora!`,
        alerta: null,
        biblical_insight: 'O homem bom deixa herança aos filhos de seus filhos. (Provérbios 13:22)',
        quick_actions: ['Dividir em Envelopes']
      };
    }
    
    return {
      insight_type: 'info',
      message: `Este mês já tiveste ${totals.totalExpenses} MT em saídas. Tens a certeza de que apontaste tudo?`,
      alerta: null,
      biblical_insight: null,
      quick_actions: ['Adicionar Despesa']
    };
  }

  return insight;
}
