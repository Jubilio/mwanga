const { callBinth } = require('../services/binthService');
const { db } = require('../config/db');
const { z } = require('zod');

const chatSchema = z.object({
  message: z.string().min(1).max(2000).trim(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional().default([]),
  provider: z.enum(['gemini', 'groq', 'openrouter']).optional().default('gemini'),
  apiKey: z.string().optional(),
}).strict();

const insightSchema = z.object({
  page: z.enum([
    'dashboard', 'dividas', 'metas', 'xitique', 'transacoes', 'orcamento',
    'habitacao', 'credito', 'patrimonio', 'simuladores', 'relatorio',
    'sms-import', 'nexovibe', 'insights', 'settings', 'pricing', 'admin'
  ]),
}).strict();

// ─── POST /api/binth/chat ─────────────────────────────────────────────────────
const chat = async (req, res, next) => {
  try {
    const { message, history, provider, apiKey } = chatSchema.parse(req.body);

    // Build message history in provider format
    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message.trim() }
    ];

    const response = await callBinth({
      messages,
      apiKey,
      provider,
      householdId: req.user.householdId,
      userId: req.user.id
    });

    res.json(response);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error('[Binth Chat Error]', err.message);
    res.status(500).json({
      message: 'Tive um problema a processar o teu pedido. Tenta novamente! 😊',
      insight_type: 'info',
      quick_actions: ['Tentar novamente', 'Ver o Dashboard'],
      data: null
    });
  }
};

// ─── GET /api/binth/score ─────────────────────────────────────────────────────
const getScore = async (req, res) => {
  try {
    const { householdId } = req.user;
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Financial data for score calculation in parallel
    const [summaryRes, budgetsRes, goalsRes, debtsRes, xitiqueRes] = await Promise.all([
      db.execute({
        sql: `
          SELECT 
            SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END) as receitas,
            SUM(CASE WHEN type IN ('despesa', 'renda') THEN amount ELSE 0 END) as despesas
          FROM transactions WHERE household_id = ? AND date >= ?
        `,
        args: [householdId, monthStart]
      }),
      db.execute({
        sql: `
          SELECT b.category, b.limit_amount, COALESCE(SUM(t.amount), 0) as spent
          FROM budgets b
          LEFT JOIN transactions t ON t.category = b.category 
            AND t.household_id = b.household_id AND t.type IN ('despesa', 'renda') AND t.date >= ?
          WHERE b.household_id = ?
          GROUP BY b.category, b.limit_amount
        `,
        args: [monthStart, householdId]
      }),
      db.execute({
        sql: `SELECT target_amount, saved_amount FROM goals WHERE household_id = ?`,
        args: [householdId]
      }),
      db.execute({
        sql: `SELECT SUM(remaining_amount) as total FROM debts WHERE household_id = ? AND status = 'pending'`,
        args: [householdId]
      }),
      db.execute({
        sql: `SELECT id FROM xitiques WHERE household_id = ? AND status = 'active' LIMIT 1`,
        args: [householdId]
      })
    ]);

    const summary = summaryRes.rows[0] || { receitas: 0, despesas: 0 };
    const budgets = budgetsRes.rows;
    const goals = goalsRes.rows;
    const debts = debtsRes.rows[0];
    const xitique = xitiqueRes.rows[0];

    const receitas = summary.receitas || 0;
    const despesas = summary.despesas || 0;
    const excedente = receitas - despesas;
    const totalDebts = debts?.total || 0;
    let score = 0;
    const factors = [];

    // 1. Savings rate (max 25 pts)
    const savingsRate = receitas > 0 ? excedente / receitas : 0;
    const savingsPts = Math.min(25, Math.round(savingsRate * 125));
    score += Math.max(0, savingsPts);
    factors.push({ name: 'Taxa de poupança', pts: Math.max(0, savingsPts), max: 25, value: `${Math.round(savingsRate * 100)}%` });

    // 2. Budget control (max 25 pts)
    const overBudget = budgets.filter(b => b.spent > b.limit_amount).length;
    const budgetPts = Math.max(0, 25 - overBudget * 8);
    score += budgetPts;
    factors.push({ name: 'Controlo de orçamento', pts: budgetPts, max: 25, value: overBudget > 0 ? `${overBudget} categorias excedidas` : 'Tudo dentro do orçamento' });

    // 3. Goals progress (max 20 pts)
    const avgGoalPct = goals.length > 0
      ? goals.reduce((s, g) => s + ((g.saved_amount || 0) / (g.target_amount || 1)), 0) / goals.length
      : 0;
    const goalPts = Math.round(avgGoalPct * 20);
    score += goalPts;
    factors.push({ name: 'Progresso nas metas', pts: goalPts, max: 20, value: `${Math.round(avgGoalPct * 100)}% em média` });

    // 4. Debt to income (max 20 pts)
    const annualIncome = receitas * 12;
    const debtToIncome = annualIncome > 0 ? totalDebts / annualIncome : 0;
    const debtPts = debtToIncome > 3 ? 0 : debtToIncome > 1.5 ? 10 : Math.round(20 - debtToIncome * 6);
    score += Math.max(0, debtPts);
    factors.push({ name: 'Rácio dívida/rendimento', pts: Math.max(0, debtPts), max: 20, value: `${debtToIncome.toFixed(1)}x rendimento anual` });

    // 5. Xitique / community (max 10 pts)
    const xitiquePts = xitique ? 10 : 0;
    score += xitiquePts;
    factors.push({ name: 'Poupança comunitária', pts: xitiquePts, max: 10, value: xitique ? 'Xitique activo ✦' : 'Sem grupo activo' });

    const finalScore = Math.min(100, Math.max(0, score));
    const label = finalScore >= 90 ? 'Perfeito' : finalScore >= 75 ? 'Excelente' : finalScore >= 60 ? 'Bom' : finalScore >= 40 ? 'A melhorar' : 'Crítico';

    res.json({ score: finalScore, label, factors });

  } catch (err) {
    console.error('[Binth Score Error]', err.message);
    res.status(500).json({ error: 'Erro ao calcular o score', message: err.message });
  }
};

// ─── GET /api/binth/insights/:page ───────────────────────────────────────────
const getPageInsight = async (req, res, next) => {
  try {
    const { page } = insightSchema.parse(req.params);
    const { householdId } = req.user;

    // Comprehensive prompts for all pages
    const pagePrompts = {
      // CORE PAGES
      dashboard: "Dá-me um resumo executivo rápido da minha saúde financeira hoje (máx 2 frases). Inclui o que está bem e o que precisa atenção.",

      // TRANSACTIONS & BUDGET
      transacoes: "Analisa os meus padrões de gasto do mês. Qual é a categoria com mais despesa? Há alguma tendência preocupante? Dá uma dica de otimização.",
      orcamento: "Vê como está o meu orçamento. Há categorias que estão sempre acima do limite? Ajuda-me a reajustar os limites de forma realista.",

      // DEBT & FINANCING
      dividas: "Analisa as minhas dívidas e sugere qual amortizar primeiro ou como negociar. Sê muito encorajadora e prático.",
      credito: "Avalia o meu histórico de crédito e simula como um novo empréstimo afetaria a minha situação. Dá conselhos sobre o timing ideal.",
      habitacao: "Analisa os meus gastos com habitação (renda/hipoteca). Está dentro de parâmetros saudáveis? Há espaço para renegociar?",

      // SAVINGS & GOALS
      metas: "Vê o progresso das minhas metas de poupança. Qual está mais perto? Como posso acelerar o alcance de uma delas?",
      xitique: "Dá-me um conselho estratégico sobre como usar melhor o meu grupo de Xitique. Quando devo receber? Como gerir o fundo?",
      patrimonio: "Analisa o crescimento do meu património. Quais são os meus maiores ativos? Para onde devo focar para crescer mais rápido?",

      // PLANNING & ANALYSIS
      simuladores: "Com base nos meus dados, que simulação seria mais útil para você agora? Empréstimo? Investimento? Reformulação orçamental?",
      relatorio: "Gera insights chave para o meu relatório mensal. Destaques, desafios e oportunidades em 3 pontos principais.",

      // DATA & INSIGHTS
      intentos: "Dá-me os principais insights financeiros derivados do meu SMS Import. Há padrões interessantes nas transações detectadas?",
      'sms-import': "Analisa as transações que importei via SMS. A IA detectou corretamente? Há gastos inesperados para investigar?",
      nexovibe: "O que está a acontecer na comunidade NEXO? Há tendências financeiras que toda a gente está a fazer que tu sugerias?",
      insights: "Dá-me um resumo das análises que já fiz. Qual foi o insight mais impactante? No que devo focar a seguir?",

      // SETTINGS & ACCOUNT
      settings: "Baseado no teu perfil, há configurações que eu sugeriria mudar para melhor acompanhar os teus objetivos?",
      pricing: "Qual seria o melhor plano para você? Startup, Crescimento ou Premium? Vou calcular o ROI de cada um.",

      // ADMIN & SYSTEM
      admin: "Relatório de saúde do sistema. Quantos utilizadores? Transações? Há Data Integrity issues a considerar?"
    };

    const prompt = pagePrompts[page] || "Dá-me um conselho financeiro valioso baseado nos meus dados pessoais.";

    const response = await callBinth({
      messages: [{ role: 'user', content: prompt }],
      householdId,
      userId: req.user.id
    });

    res.json(response);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error('[Binth Insights Error]', err.message);
    res.status(500).json({
      message: 'Não consegui gerar um insight agora. Mas continua o bom trabalho! 💪',
      insight_type: 'info',
      quick_actions: []
    });
  }
};

module.exports = { chat, getScore, getPageInsight };
