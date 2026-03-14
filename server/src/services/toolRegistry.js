const { db } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Tool Registry: O Moat Defensável do Mwanga.
 * Ferramentas determinísticas rigorosas que a IA pode invocar.
 */
const tools = [
  {
    name: 'calculateLiquidityRisk',
    description: 'Calcula o risco de liquidez do agregado familiar nos próximos 30 dias com base nas despesas recorrentes e metas.',
    parameters: {
      type: 'object',
      properties: {
        householdId: { type: 'number', description: 'O ID numérico do household' }
      },
      required: ['householdId']
    },
    // Execução determinística controlada
    execute: async ({ householdId }) => {
      // 1. Lógica rigorosa ligada ao LibSQL
      const summaryRes = await db.execute({
        sql: `
          SELECT 
            SUM(CASE WHEN type='receita' THEN amount ELSE 0 END) as receita,
            SUM(CASE WHEN type='despesa' THEN amount ELSE 0 END) as despesa
          FROM transactions WHERE household_id = ?
        `,
        args: [householdId]
      });
      const summary = summaryRes.rows[0] || { receita: 0, despesa: 0 };

      const income = Number(summary.receita || 0);
      const spent = Number(summary.despesa || 0);
      const liquidity = income - spent;

      const score = income > 0 ? ((liquidity / income) * 100).toFixed(1) : 0;
      let riskLevel = 'LOW';
      if (score < 10) riskLevel = 'CRITICAL';
      else if (score < 20) riskLevel = 'MODERATE';

      return {
        success: true,
        data: {
          currentLiquidityMZ: liquidity,
          liquidityScorePercentage: Number(score),
          riskLevel: riskLevel,
          recommendation: riskLevel === 'CRITICAL' 
            ? 'Cortar despesas não essenciais imediatamente.' 
            : 'Liquidez saudável.'
        }
      };
    }
  },
  {
    name: 'getSavingsRecommendations',
    description: 'Analisa o orçamento actual e propõe cortes específicos em categorias excedidas ou despesas recorrentes.',
    parameters: {
      type: 'object',
      properties: {
        householdId: { type: 'number' }
      },
      required: ['householdId']
    },
    execute: async ({ householdId }) => {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      
      const budgetsRes = await db.execute({
        sql: `
          SELECT b.category, b.limit_amount, COALESCE(SUM(t.amount), 0) as spent
          FROM budgets b
          LEFT JOIN transactions t ON t.category = b.category 
            AND t.household_id = b.household_id AND t.type = 'despesa' AND t.date >= ?
          WHERE b.household_id = ?
          GROUP BY b.category, b.limit_amount
        `,
        args: [monthStart, householdId]
      });
      const budgets = budgetsRes.rows;

      const exceeded = budgets.filter(b => b.spent > b.limit_amount);
      
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
