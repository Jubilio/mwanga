const { db } = require('../config/db');
const logger = require('../utils/logger');
const actions = require('./binthActions');

/**
 * Tool Registry: O Moat Defensável do Mwanga.
 * Ferramentas determinísticas rigorosas que a IA pode invocar.
 */
const tools = [
  {
    name: 'calculateLiquidityRisk',
    description: 'Compara o que entrou e saiu nos últimos 30 dias com o saldo actual das contas e diz quantos meses o saldo cobre.',
    // The household always comes from the signed-in session, never from the model.
    // Gemini (also when reached through OpenRouter) rejects an object schema with
    // no properties, so each tool declares at least one optional argument.
    parameters: {
      type: 'object',
      properties: { periodDays: { type: 'number', description: 'Dias a analisar (por omissão 30)' } }
    },
    // Execução determinística controlada
    execute: async ({ householdId }) => {
      // Last 30 days of income and spending, against the money in the accounts now.
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const [summaryRes, accountsRes] = await Promise.all([
        db.execute({
          sql: `
            SELECT
              SUM(CASE WHEN type='receita' THEN amount ELSE 0 END) as receita,
              SUM(CASE WHEN type IN ('despesa', 'renda') THEN amount ELSE 0 END) as despesa
            FROM transactions WHERE household_id = ? AND date >= ?
          `,
          args: [householdId, since]
        }),
        db.execute({
          sql: 'SELECT SUM(current_balance) as total FROM accounts WHERE household_id = ?',
          args: [householdId]
        })
      ]);
      const summary = summaryRes.rows[0] || {};
      const income = Number(summary.receita || 0);
      const spent = Number(summary.despesa || 0);
      const balance = Number(accountsRes.rows[0]?.total || 0);
      const net = income - spent;
      // How many months the current balance covers at the last 30 days' spending.
      const coverMonths = spent > 0 ? balance / spent : null;

      let riskLevel = 'LOW';
      if (coverMonths !== null && coverMonths < 0.5) riskLevel = 'CRITICAL';
      else if ((coverMonths !== null && coverMonths < 1) || net < 0) riskLevel = 'MODERATE';

      return {
        success: true,
        data: {
          periodDays: 30,
          incomeLast30DaysMZN: income,
          spendingLast30DaysMZN: spent,
          netLast30DaysMZN: net,
          balanceNowMZN: balance,
          monthsCoveredByBalance: coverMonths === null ? null : Number(coverMonths.toFixed(1)),
          riskLevel,
          recommendation: riskLevel === 'CRITICAL'
            ? 'Cortar despesas não essenciais imediatamente.'
            : riskLevel === 'MODERATE'
              ? 'Gastos acima do que entra ou saldo curto: rever as maiores despesas.'
              : 'Liquidez saudável.'
        }
      };
    }
  },
  {
    name: 'getSavingsRecommendations',
    description: 'Analisa o orçamento actual e propõe cortes específicos em categorias excedidas ou despesas recorrentes.',
    // See calculateLiquidityRisk: at least one optional argument for Gemini.
    parameters: {
      type: 'object',
      properties: { focusCategory: { type: 'string', description: 'Categoria a analisar primeiro (opcional)' } }
    },
    execute: async ({ householdId }) => {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      
      const budgetsRes = await db.execute({
        sql: `
          SELECT b.category, b.limit_amount, COALESCE(SUM(t.amount), 0) as spent
          FROM budgets b
          LEFT JOIN transactions t ON t.category = b.category 
            AND t.household_id = b.household_id AND t.type IN ('despesa', 'renda') AND t.date >= ?
          WHERE b.household_id = ?
          GROUP BY b.category, b.limit_amount
        `,
        args: [monthStart, householdId]
      });
      const budgets = budgetsRes.rows;

      const exceeded = budgets.filter(b => Number(b.spent) > Number(b.limit_amount));
      
      return {
        success: true,
        data: {
          exceededCategories: exceeded,
          generalTip: exceeded.length > 0 
            ? `Notámos excesso em ${exceeded.length} categorias. Tenta reduzir gastos supérfluos nestas áreas.`
            : 'O teu orçamento está equilibrado! Considera aumentar a tua meta de poupança em 5%.'
        }
      };
    }
  }
];

// Proposal tools: they never write. The app asks the person to confirm first.
tools.push(
  {
    name: 'proposeTransaction',
    description: 'Usa quando o utilizador diz que gastou, pagou, comprou, recebeu ou ganhou dinheiro (ex: "gastei 500 no chapa"). Prepara a transação para o utilizador confirmar; não regista nada sozinha.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['despesa', 'receita'], description: 'despesa para saídas, receita para entradas' },
        amount: { type: 'number', description: 'Valor em meticais (MT)' },
        description: { type: 'string', description: 'Descrição curta, ex: "Chapa para o trabalho"' },
        category: { type: 'string', enum: actions.CATEGORIES, description: 'Categoria mais provável' },
        date: { type: 'string', description: 'Data AAAA-MM-DD, só se o utilizador indicar outro dia' }
      },
      required: ['type', 'amount', 'description']
    },
    proposal: true,
    execute: async (args) => actions.proposeTransaction(args)
  },
  {
    name: 'proposeDebtPayment',
    description: 'Usa quando o utilizador diz que pagou (ou quer pagar) uma dívida registada. Prepara o pagamento para o utilizador confirmar.',
    parameters: {
      type: 'object',
      properties: {
        creditor: { type: 'string', description: 'Nome do credor tal como aparece em DÍVIDAS PENDENTES' },
        amount: { type: 'number', description: 'Valor pago em MT; omite para usar a prestação' }
      },
      required: ['creditor']
    },
    proposal: true,
    execute: async (args) => actions.proposeDebtPayment(args)
  },
  {
    name: 'proposeXitiquePayment',
    description: 'Usa quando o utilizador diz que pagou a sua contribuição de xitique. Prepara a próxima contribuição por pagar para o utilizador confirmar.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome do grupo de xitique, se o utilizador o disser' }
      }
    },
    proposal: true,
    execute: async (args) => actions.proposeXitiquePayment(args)
  }
);

// Advisor tools (Binth as a financial advisor). Read tools return numbers the
// rules computed; propose tools prepare a card the person confirms in the app.
const advisor = () => require('./advisor/advisorActions');
tools.push(
  {
    name: 'forecastBalance',
    description: 'Previsão do saldo até ao próximo salário: quanto sobra, se o dinheiro acaba antes e em que dia, compromissos que vencem (xitique, renda, dívidas) e quanto cortar por dia. Usa quando perguntam "chego ao fim do mês?" ou "quanto posso gastar?".',
    parameters: { type: 'object', properties: { horizonDays: { type: 'number', description: 'Ignorado: o horizonte é o próximo salário (opcional)' } } },
    execute: async (args) => advisor().forecastBalanceTool(args),
  },
  {
    name: 'findRecurringPayments',
    description: 'Lista pagamentos que se repetem todos os meses (recargas, assinaturas, propinas) com valor médio e próxima data provável.',
    parameters: { type: 'object', properties: { minAmount: { type: 'number', description: 'Valor mínimo em MT (opcional)' } } },
    execute: async (args) => advisor().recurringTool(args),
  },
  {
    name: 'simulateDebtPayoff',
    description: 'Simula como sair das dívidas pagando um valor por mês: estratégia juro mais caro primeiro (avalanche) e dívida mais pequena primeiro (bola de neve), com meses e juros totais.',
    parameters: {
      type: 'object',
      properties: {
        monthlyBudget: { type: 'number', description: 'Quanto o utilizador pode pagar por mês no total, em MT' },
        strategy: { type: 'string', enum: ['avalanche', 'snowball'], description: 'Estratégia preferida (opcional)' },
      },
    },
    execute: async (args) => advisor().debtPayoffTool(args),
  },
  {
    name: 'checkCreditReadiness',
    description: 'Diz se o utilizador está pronto para pedir crédito: rendimento estável, histórico, peso das dívidas, reserva e atrasos, com a prestação máxima sensata. Não recomenda produtos de crédito.',
    parameters: { type: 'object', properties: { amount: { type: 'number', description: 'Valor que pensa pedir, em MT (opcional)' } } },
    execute: async (args) => advisor().creditReadinessTool(args),
  },
  {
    name: 'proposeMonthlyPlan',
    description: 'Prepara um plano do mês com envelopes por categoria (orçamentos) a partir do rendimento e dos gastos reais. O utilizador confirma no ecrã.',
    parameters: { type: 'object', properties: { note: { type: 'string', description: 'Pedido especial do utilizador (opcional)' } } },
    proposal: true,
    execute: async (args) => advisor().proposeMonthlyPlan(args),
  },
  {
    name: 'proposeDebtPlan',
    description: 'Prepara um plano para sair das dívidas com um valor por mês. Pergunta primeiro quanto pode pagar por mês se não souberes.',
    parameters: {
      type: 'object',
      properties: {
        monthlyBudget: { type: 'number', description: 'Total por mês para dívidas, em MT' },
        strategy: { type: 'string', enum: ['avalanche', 'snowball'], description: 'avalanche (juro mais caro primeiro) ou snowball (mais pequena primeiro)' },
      },
      required: ['monthlyBudget'],
    },
    proposal: true,
    execute: async (args) => advisor().proposeDebtPlan(args),
  },
  {
    name: 'proposeEmergencyFund',
    description: 'Prepara um plano de fundo de emergência (meses de despesas essenciais) com quanto poupar por mês.',
    parameters: {
      type: 'object',
      properties: {
        months: { type: 'number', description: 'Meses de despesas a cobrir, 1 a 12 (por omissão 3)' },
        monthly: { type: 'number', description: 'Quanto quer poupar por mês, em MT (opcional)' },
      },
    },
    proposal: true,
    execute: async (args) => advisor().proposeEmergencyFund(args),
  },
  {
    name: 'proposeBudgetChange',
    description: 'Prepara a alteração do orçamento mensal de uma categoria. O utilizador confirma no ecrã.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: actions.CATEGORIES, description: 'Categoria' },
        limit: { type: 'number', description: 'Novo limite mensal em MT' },
      },
      required: ['category', 'limit'],
    },
    proposal: true,
    execute: async (args) => advisor().proposeBudgetChange(args),
  },
  {
    name: 'proposeGoal',
    description: 'Prepara uma nova meta de poupança (ex: "quero juntar 20 mil para a escola até Janeiro").',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome curto da meta' },
        target: { type: 'number', description: 'Valor a juntar em MT' },
        deadline: { type: 'string', description: 'Data limite AAAA-MM-DD (opcional)' },
        monthly: { type: 'number', description: 'Quanto pôr por mês em MT (opcional)' },
      },
      required: ['name', 'target'],
    },
    proposal: true,
    execute: async (args) => advisor().proposeGoal(args),
  },
  {
    name: 'proposeGoalTopUp',
    description: 'Prepara um reforço de uma meta existente (ex: "pus 2000 na meta da escola").',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nome ou parte do nome da meta' },
        amount: { type: 'number', description: 'Valor em MT' },
      },
      required: ['amount'],
    },
    proposal: true,
    execute: async (args) => advisor().proposeGoalTopUp(args),
  },
  {
    name: 'proposeReminder',
    description: 'Prepara um lembrete para um dia (ex: "lembra-me de pagar a escola no dia 5"). A Binth envia no dia, por notificação.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Dia AAAA-MM-DD, de hoje até um ano' },
        text: { type: 'string', description: 'Texto curto do lembrete' },
      },
      required: ['date', 'text'],
    },
    proposal: true,
    execute: async (args) => advisor().proposeReminder(args),
  },
  {
    name: 'proposeRememberFact',
    description: 'Pede autorização para lembrar um facto útil e duradouro que o utilizador contou (ex: "recebo a 25", "pago a escola dos filhos em Fevereiro"). Nunca guardes números de conta, PINs, senhas ou dados de saúde.',
    parameters: { type: 'object', properties: { fact: { type: 'string', description: 'O facto numa frase curta, na terceira pessoa' } }, required: ['fact'] },
    proposal: true,
    execute: async (args) => advisor().proposeRememberFact(args),
  }
);

class ToolRegistry {
  /**
   * Converte o esquema interno das nossas Tools para o formato universal JSON Schema
   * compreendido por provedores como Gemini, OpenAI e Anthropic.
   */
  static getToolsSchema() {
    return tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));
  }

  /**
   * Verifica se a IA solicitou chamar uma ferramenta existente e executa o código base.
   */
  static async executeTool(toolName, args) {
    const tool = tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tentativa de invocação de ferramenta não autorizada ou inexistente: ${toolName}`);
    }
    
    logger.info({ tool: toolName, args }, 'Executing tool securely');
    return await tool.execute(args);
  }
}

module.exports = ToolRegistry;
