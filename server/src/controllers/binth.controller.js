const { localizeScore } = require('../services/scoreLanguage');
const { resolveLanguage } = require('../services/binthLanguage');
const { callBinth, buildUserContext } = require('../services/binthService');
const { db } = require('../config/db');
const { cacheKey, getCachedInsight, setCachedInsight } = require('../services/binthInsightCache');
const { z } = require('zod');

const chatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(4000),
  })).max(30).optional().default([]),
  provider: z.enum(['gemini', 'groq', 'openrouter']).optional().default('gemini'),
  apiKey: z.string().optional(),
  language: z.enum(['pt', 'en']).optional(),
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
    const { message, history, provider, apiKey, language } = chatSchema.parse(req.body);

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
      userId: req.user.id,
      language: resolveLanguage(language || req.get('Accept-Language'))
    });

    res.json(response);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error('[Binth Chat Error]', err.message);
    res.status(500).json({
      message: resolveLanguage(req.body?.language || req.get('Accept-Language')) === 'en' ? 'I could not process your request. Please try again.' : 'Tive um problema a processar o teu pedido. Tenta novamente!',
      insight_type: 'info',
      quick_actions: [],
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

    // 1. Savings rate (max 25 pts) — Poupança e Proteção
    const savingsRate = receitas > 0 ? excedente / receitas : 0;
    const savingsPts = Math.min(25, Math.round(savingsRate * 125));
    score += Math.max(0, savingsPts);
    factors.push({
      name: 'Taxa de poupança',
      pts: Math.max(0, savingsPts),
      max: 25,
      value: `${Math.round(savingsRate * 100)}%`,
      biblical_principle: 'Poupança e Proteção'
    });

    // 2. Budget control (max 25 pts) — Planeamento e Sabedoria
    const overBudget = budgets.filter(b => b.spent > b.limit_amount).length;
    const budgetPts = Math.max(0, 25 - overBudget * 8);
    score += budgetPts;
    factors.push({
      name: 'Controlo de orçamento',
      pts: budgetPts,
      max: 25,
      value: overBudget > 0 ? `${overBudget} categorias excedidas` : 'Tudo dentro do orçamento',
      biblical_principle: 'Planeamento e Sabedoria'
    });

    // 3. Goals progress (max 20 pts) — Fidelidade no Pouco
    const avgGoalPct = goals.length > 0
      ? goals.reduce((s, g) => s + ((g.saved_amount || 0) / (g.target_amount || 1)), 0) / goals.length
      : 0;
    const goalPts = Math.round(avgGoalPct * 20);
    score += goalPts;
    factors.push({
      name: 'Progresso nas metas',
      pts: goalPts,
      max: 20,
      value: `${Math.round(avgGoalPct * 100)}% em média`,
      biblical_principle: 'Fidelidade no Pouco'
    });

    // 4. Debt to income (max 20 pts) — Evitar Dívidas Excessivas
    const annualIncome = receitas * 12;
    const debtToIncome = annualIncome > 0 ? totalDebts / annualIncome : 0;
    const debtPts = debtToIncome > 3 ? 0 : debtToIncome > 1.5 ? 10 : Math.round(20 - debtToIncome * 6);
    score += Math.max(0, debtPts);
    factors.push({
      name: 'Rácio dívida/rendimento',
      pts: Math.max(0, debtPts),
      max: 20,
      value: `${debtToIncome.toFixed(1)}x rendimento anual`,
      biblical_principle: 'Evitar Dívidas Excessivas'
    });

    // 5. Xitique / community (max 10 pts) — Generosidade
    const xitiquePts = xitique ? 10 : 0;
    score += xitiquePts;
    factors.push({
      name: 'Poupança comunitária',
      pts: xitiquePts,
      max: 10,
      value: xitique ? 'Xitique activo ✦' : 'Sem grupo activo',
      biblical_principle: 'Generosidade'
    });

    const finalScore = Math.min(100, Math.max(0, score));
    const label = finalScore >= 90 ? 'Perfeito' : finalScore >= 75 ? 'Excelente' : finalScore >= 60 ? 'Bom' : finalScore >= 40 ? 'A melhorar' : 'Crítico';
    const biblical_label =
      finalScore >= 90 ? 'Fiel Mordomo 🏆' :
      finalScore >= 75 ? 'Sábio Gestor 🌟' :
      finalScore >= 60 ? 'Em Progresso 📈' :
      finalScore >= 40 ? 'Precisa Atenção ⚠️' :
                         'Momento de Reflexão 🙏';

    res.json(localizeScore({ score: finalScore, label, biblical_label, factors }, resolveLanguage(req.query?.language || req.get('Accept-Language'))));

  } catch (err) {
    console.error('[Binth Score Error]', err.message);
    res.status(500).json({ error: resolveLanguage(req.get('Accept-Language')) === 'en' ? 'Could not calculate the score' : 'Erro ao calcular o score', message: err.message });
  }
};

// ─── GET /api/binth/insights/:page ───────────────────────────────────────────
const getPageInsight = async (req, res, next) => {
  try {
    const { page } = insightSchema.parse(req.params);
    const { householdId } = req.user;

    // One short question per page. Only ask about data the Binth actually receives.
    const pagePrompts = {
      dashboard: "Dá-me um resumo rápido da minha saúde financeira hoje (máx 2 frases): o que está bem e o que precisa de atenção.",
      transacoes: "Olha para os meus gastos deste mês. Há alguma tendência preocupante? Dá uma dica concreta para poupar.",
      orcamento: "Como está o meu orçamento este mês? Que categorias passaram do limite e como posso ajustar de forma realista?",
      dividas: "Analisa as minhas dívidas e diz qual devo pagar primeiro e porquê. Sê encorajadora e prática.",
      credito: "Antes de pedir um novo crédito, o que devo verificar na minha situação actual? Dá um conselho sobre o momento certo.",
      habitacao: "Os meus custos de habitação estão em dia e dentro de um valor saudável para o que ganho?",
      metas: "Como estão as minhas metas de poupança? Qual está mais perto e como posso acelerar uma delas?",
      xitique: "Dá-me um conselho prático para gerir bem os meus compromissos de xitique este mês.",
      patrimonio: "Olha para os meus activos e dívidas. Onde devo focar para fazer crescer o meu património?",
      simuladores: "Com base nos meus dados, que simulação me seria mais útil agora: crédito, poupança ou xitique? Porquê?",
      relatorio: "Resume o meu mês em 3 pontos: um destaque, um desafio e uma oportunidade.",
      'sms-import': "Olhando para as minhas transações recentes, há algum gasto inesperado que valha a pena confirmar?",
      insights: "Qual é a coisa mais importante em que devo focar nas minhas finanças esta semana?",
      settings: "Que hábito simples no Mwanga me ajudaria a acompanhar melhor os meus objetivos?",
      pricing: "Com base no uso que faço do Mwanga, que funcionalidades me ajudariam mais? Os planos são Starter (grátis), Crescimento e Património. Não inventes preços.",
      nexovibe: "Dá-me uma dica financeira prática para esta semana com base nos meus dados.",
      admin: "Dá-me uma dica financeira prática para esta semana com base nos meus dados.",
    };

    const prompt = pagePrompts[page] || "Dá-me um conselho financeiro útil baseado nos meus dados.";
    const language = resolveLanguage(req.body?.language || req.query?.language || req.get('Accept-Language'));

    // Cache per page; the version changes whenever transactions change, so new
    // records still produce a fresh insight. ?refresh=1 skips the cache.
    const versionRes = await db.execute({
      sql: 'SELECT COUNT(*) as n, MAX(id) as last FROM transactions WHERE household_id = ?',
      args: [householdId]
    }).catch(() => null);
    const version = versionRes?.rows?.[0] ? `${versionRes.rows[0].n || 0}-${versionRes.rows[0].last || 0}` : 'v0';
    const key = cacheKey({ householdId, userId: req.user.id, page, language, version });
    const refresh = String(req.query?.refresh || '') === '1';
    if (!refresh) {
      const cached = await getCachedInsight(key);
      if (cached) return res.json(cached);
    }

    const response = await callBinth({
      messages: [{ role: 'user', content: prompt }],
      householdId,
      userId: req.user.id,
      language
    });
    await setCachedInsight(key, response);

    res.json(response);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error('[Binth Insights Error]', err.message);
    res.status(500).json({
      message: resolveLanguage(req.query?.language || req.get('Accept-Language')) === 'en' ? 'I could not generate an insight. Please try again.' : 'Não consegui gerar uma sugestão. Tenta novamente.',
      insight_type: 'info',
      quick_actions: []
    });
  }
};

const getPriority = async (req, res) => {
  try {
    const userContext = await buildUserContext(req.user.householdId, req.user.id);
    const { priority, overdueBudgetCount, topOverBudgetCategory, topGoalName, topGoalPct, rentTotal, xitiqueTotal, debtMonthlyTotal, monthlyIncome, monthlyExpenses, debtTotal, assetsTotal, cashAvailable } = userContext.summary;

    return res.json({
      priority,
      overdueBudgetCount,
      topOverBudgetCategory,
      topGoalName,
      topGoalPct,
      rentTotal,
      xitiqueTotal,
      debtMonthlyTotal,
      monthlyIncome,
      monthlyExpenses,
      debtTotal,
      assetsTotal,
      cashAvailable,
    });
  } catch (err) {
    console.error('[Binth Priority Error]', err.message);
    return res.status(500).json({ error: 'Não foi possível gerar o plano financeiro agora.' });
  }
};

module.exports = { chat, getScore, getPageInsight, getPriority };
