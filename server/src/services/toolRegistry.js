const { db } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Tool Registry: O Moat Defensável do Mwanga.
 * Ferramentas determinísticas rigorosas que a IA pode invocar.
 */
const tools = [
  {
    name: 'calculateLiquidityRisk',
    description: 'Compara o que entrou e saiu nos últimos 30 dias com o saldo actual das contas e diz quantos meses o saldo cobre.',
    // No arguments: the household always comes from the signed-in session.
    parameters: { type: 'object', properties: {} },
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
    // No arguments: the household always comes from the signed-in session.
    parameters: { type: 'object', properties: {} },
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
