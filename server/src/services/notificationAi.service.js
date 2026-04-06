const logger = require('../utils/logger');
const { buildUserContext, callBinth } = require('./binthService');

function truncate(value, max) {
  const text = String(value || '').trim();
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function resolveTone(notificationType, eventContext = {}, summary = {}) {
  if (notificationType === 'warning') {
    return 'urgent';
  }

  if (notificationType === 'motivation') {
    return summary.overdueBudgetCount > 0 ? 'steady' : 'celebratory';
  }

  if (eventContext.triggerType === 'monthly_commitments_due') {
    return 'practical';
  }

  return 'friendly';
}

function buildFallbackContent({
  notificationType,
  eventContext = {},
  summary = {},
  actionPayload = {},
}) {
  const userName = summary.userName || 'amigo';
  const tone = resolveTone(notificationType, eventContext, summary);
  const category = eventContext.category || summary.topOverBudgetCategory || 'o orçamento';
  const usagePercent = Number(eventContext.usagePercent || 0);
  const streakDays = Number(eventContext.streakDays || 0);
  const date = actionPayload.date || new Date().toISOString().slice(0, 10);

  if (notificationType === 'warning') {
    return {
      title: truncate(`Pressão em ${category}`, 42),
      message: truncate(
        `${userName}, já vais em ${usagePercent}% do limite de ${category}. Age agora para não deixar o dia fugir do plano.`,
        128
      ),
      tone,
      quickActions: ['Ver orçamento', 'Ajustar gasto', 'Fechar o dia'],
    };
  }

  if (notificationType === 'motivation') {
    return {
      title: truncate('Sequência financeira ativa', 42),
      message: truncate(
        `${userName}, já somas ${streakDays} dias de consistência. Um registo rápido hoje mantém a tua sequência viva.`,
        128
      ),
      tone,
      quickActions: ['Registar agora', 'Ver progresso', 'Continuar sequência'],
    };
  }

  if (eventContext.triggerType === 'monthly_commitments_due') {
    return {
      title: truncate('Compromissos do mês à vista', 42),
      message: truncate(
        `${userName}, tens compromissos para confirmar neste ciclo. Faz um check-in rápido antes que o mês te surpreenda.`,
        128
      ),
      tone,
      quickActions: ['Abrir resumo', 'Confirmar pagamento', 'Fechar o dia'],
    };
  }

  return {
    title: truncate('O teu dia financeiro está em branco', 42),
    message: truncate(
      `${userName}, ainda falta fechar ${date}. Leva menos de 20 segundos manter a tua disciplina viva.`,
      128
    ),
    tone,
    quickActions: ['Adicionar despesa', 'Adicionar receita', 'Fechar o dia'],
  };
}

function hasAiProvider() {
  return Boolean(
    process.env.GEMINI_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.GROQ_API_KEY
  );
}

async function generatePersonalizedNotification({
  householdId,
  userId,
  notificationType,
  eventContext = {},
  actionPayload = {},
}) {
  let contextSummary = {};

  try {
    const userContext = await buildUserContext(householdId, userId);
    contextSummary = userContext.summary || {};
  } catch (error) {
    logger.warn(`Notification context fallback activated: ${error.message}`);
  }

  const fallback = buildFallbackContent({
    notificationType,
    eventContext,
    summary: contextSummary,
    actionPayload,
  });

  if (process.env.NOTIFICATION_AI_DISABLED === 'true' || !hasAiProvider()) {
    return {
      ...fallback,
      aiPersonalized: false,
      contextSummary,
    };
  }

  try {
    const aiResponse = await callBinth({
      householdId,
      userId,
      provider: process.env.NOTIFICATION_AI_PROVIDER || 'gemini',
      messages: [
        {
          role: 'user',
          content: `
Cria UMA notificação push curta e de alto impacto para o Mwanga.
Tipo comportamental: ${notificationType}
Evento: ${JSON.stringify(eventContext)}
Contexto do Utilizador: ${JSON.stringify(contextSummary)}

Ações Disponíveis (usa estas chaves se fizer sentido):
- "ADD_EXPENSE" (Gasto)
- "ADD_INCOME" (Receita)
- "VIEW_BUDGET" (Orçamento)
- "OPEN_DAILY_LOG" (Fechar dia)

Responde em JSON puro com:
{
  "message": "mensagem curta (máx 128 chars)",
  "insight_type": "warning | celebration | info | action",
  "actions": [
    {"label": "Texto do Botão", "id": "ADD_EXPENSE"},
    ... (máx 2)
  ]
}
          `.trim(),
        },
      ],
    });

    const message = truncate(aiResponse?.message || fallback.message, 128);
    const insightType = aiResponse?.insight_type || notificationType;
    const titleMap = {
      warning: fallback.title,
      celebration: 'Boa energia financeira',
      action: 'Pequena ação, grande clareza',
      info: fallback.title,
    };

    const actions = Array.isArray(aiResponse?.actions) && aiResponse.actions.length > 0
      ? aiResponse.actions.map(a => ({ action: a.id, title: a.label }))
      : fallback.quickActions.map(label => ({ action: 'OPEN_DAILY_LOG', title: label }));

    return {
      title: truncate(titleMap[insightType] || fallback.title, 42),
      message,
      tone: fallback.tone,
      quickActions: actions.slice(0, 2),
      aiPersonalized: true,
      contextSummary,
    };
  } catch (error) {
    logger.warn(`AI notification personalization fallback activated: ${error.message}`);
    return {
      ...fallback,
      aiPersonalized: false,
      contextSummary,
    };
  }
}

module.exports = { generatePersonalizedNotification };
