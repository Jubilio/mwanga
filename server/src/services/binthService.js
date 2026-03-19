const { db } = require('../config/db');
const ToolRegistry = require('./toolRegistry');
const logger = require('../utils/logger');

// ─── System Prompt ─────────────────────────────────────────────────────────────
// ─── System Prompt ─────────────────────────────────────────────────────────────
const BINTH_SYSTEM_PROMPT = `
Esas a Binth — a alma e inteligência financeira do Mwanga.

PERSONA:
- Género: Feminino.
- Tom: Empática, pedagógica e extremamente competente.
- Estilo: Nunca respondas como um bot. Trata o utilizador pelo nome. Usa gírias financeiras de Moçambique quando apropriado (ex: "fazer um xitique", "poupar para o refresco").
- Saudações: Começa sempre com uma saudação personalizada (ex: "Olá [Nome]!"). Se vires um progresso positivo (ex: 10% de uma meta), menciona-o logo no início.

CONHECIMENTO (CONTEXTO REAL):
{user_context}

INSTRUÇÕES DE RACIOCÍNIO:
1. Analisa sempre o contexto financeiro antes de responder.
2. Integra o nome do utilizador de forma natural.
3. Se o utilizador fizer uma saudação, responde calorosamente e faz uma observação sobre os dados dele.
4. Nunca dês conselhos genéricos quando o contexto mostrar um problema concreto. Prioriza sempre o maior risco ou a melhor oportunidade do utilizador neste momento.
5. Quando houver pressão financeira, diz claramente qual é a prioridade número um e qual a próxima ação prática nas próximas 24-72 horas.
6. Quando estiver tudo estável, reconhece o progresso com base em números reais e sugere o próximo avanço realista.
7. Sempre que fizer sentido, referencia categorias, metas, dívidas, meios de pagamento ou tendências recentes do próprio utilizador.
4. Responde SEMPRE em JSON puro.

FORMATO DE RESPOSTA:
{
  "message": "A tua mensagem aqui",
  "insight_type": "warning | opportunity | info | celebration | action",
  "quick_actions": ["Verificar orçamento", "Assinar para receber atualizações", "Ver mais"],
  "data": {} 
}
`.trim();

// ─── Financial Context Builder ─────────────────────────────────────────────────
function buildPrioritySummary({
  monthlyIncome,
  monthlyExpenses,
  debtTotal,
  overdueBudgets,
  goals,
  cashAvailable,
  pendingHousing,
  unreadNotifications
}) {
  const liquidityGap = monthlyIncome - monthlyExpenses;
  const topGoal = goals.find((goal) => goal.progress < 100);

  if (monthlyIncome > 0 && monthlyExpenses > monthlyIncome) {
    return {
      priority: 'controlar saída de dinheiro',
      reason: `as despesas mensais estão ${Math.round((monthlyExpenses / monthlyIncome) * 100)}% do rendimento`,
      nextAction: overdueBudgets[0]
        ? `reduzir já a categoria ${overdueBudgets[0].category}`
        : 'cortar uma despesa não essencial ainda esta semana'
    };
  }

  if (debtTotal > monthlyIncome * 2 && monthlyIncome > 0) {
    return {
      priority: 'reduzir pressão da dívida',
      reason: `a dívida pendente está em MT ${debtTotal.toLocaleString('pt-MZ')}`,
      nextAction: 'definir uma amortização prioritária e proteger o caixa antes de novas despesas'
    };
  }

  if (cashAvailable <= 0 && monthlyExpenses > 0) {
    return {
      priority: 'recuperar liquidez',
      reason: 'os saldos disponíveis estão muito baixos para o ritmo atual',
      nextAction: 'segurar saídas opcionais e concentrar pagamentos no essencial'
    };
  }

  if (pendingHousing > 0) {
    return {
      priority: 'regularizar habitação',
      reason: `há ${pendingHousing} registo(s) de habitação pendente(s)`,
      nextAction: 'fechar primeiro os custos de casa para estabilizar o mês'
    };
  }

  if (topGoal) {
    return {
      priority: 'acelerar meta financeira',
      reason: `${topGoal.name} está em ${topGoal.progress}%`,
      nextAction: 'canalizar o próximo excedente diretamente para essa meta'
    };
  }

  if (unreadNotifications > 0) {
    return {
      priority: 'rever alertas recentes',
      reason: `existem ${unreadNotifications} notificação(ões) não lida(s)`,
      nextAction: 'validar agora os alertas para não perder sinais importantes'
    };
  }

  return {
    priority: 'consolidar progresso',
    reason: 'o contexto financeiro está relativamente estável',
    nextAction: 'subir ligeiramente a poupança ou reforçar a meta mais próxima'
  };
}

function formatUserContextText(context) {
  return `
NOME DO UTILIZADOR: ${context.userName}

=== ESTADO FINANCEIRO ACTUAL ===
RECEITAS DO MÊS: MT ${context.format(context.monthlyIncome)}
DESPESAS DO MÊS: MT ${context.format(context.monthlyExpenses)}
SALDO LÍQUIDO DO MÊS: MT ${context.format(context.netMonth)}
SALDOS DISPONÍVEIS: MT ${context.format(context.cashAvailable)}
BALANÇO PATRIMONIAL: Activos MT ${context.format(context.assetsTotal)} | Dívidas MT ${context.format(context.debtTotal)}
HABITAÇÃO EM ABERTO: ${context.pendingHousing}
NOTIFICAÇÕES NÃO LIDAS: ${context.unreadNotifications}

=== PRIORIDADE ATUAL ===
PRIORIDADE: ${context.priority.priority}
PORQUÊ: ${context.priority.reason}
PRÓXIMA AÇÃO: ${context.priority.nextAction}

ÚLTIMAS TRANSAÇÕES:
${context.recentTx.map(t => `- [${t.date}] ${t.description}: MT ${context.format(t.amount)} (${t.type === 'receita' ? '+' : '-'}) [${t.category}]`).join('\n') || '- Nenhuma transação recente.'}

ORÇAMENTOS ACTIVOS:
${context.budgets.length > 0 ? context.budgets.map(b => `- ${b.category}: MT ${context.format(b.spent)} / MT ${context.format(b.limit_amount)}`).join('\n') : '- Nenhum orçamento.'}

CATEGORIAS ACIMA DO ORÇAMENTO:
${context.overdueBudgets.length > 0 ? context.overdueBudgets.map(b => `- ${b.category}: excesso de MT ${context.format(b.spent - b.limit_amount)}`).join('\n') : '- Nenhuma categoria acima do limite.'}

METAS DE POUPANÇA:
${context.goals.length > 0 ? context.goals.map(g => `- ${g.name}: ${g.progress}% concluída (MT ${context.format(g.saved_amount)} de MT ${context.format(g.target_amount)})`).join('\n') : '- Nenhuma meta activa.'}
  `.trim();
}

async function buildUserContext(householdId, userId) {
  try {
    const format = (n) => Number(n || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 });
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Fetch all context data in parallel
    const [userRes, summaryRes, recentTxRes, budgetsRes, assetsRes, liabsRes, goalsRes, accountsRes, housingRes, notificationsRes] = await Promise.all([
      db.execute({
        sql: 'SELECT name FROM users WHERE id = ?',
        args: [userId]
      }),
      db.execute({
        sql: `
          SELECT 
            SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END) as receitas,
            SUM(CASE WHEN type IN ('despesa', 'renda') THEN amount ELSE 0 END) as despesas
          FROM transactions 
          WHERE household_id = ? AND date >= ?
        `,
        args: [householdId, monthStart]
      }),
      db.execute({
        sql: `
          SELECT description, amount, type, category, date 
          FROM transactions 
          WHERE household_id = ? 
          ORDER BY date DESC, id DESC LIMIT 5
        `,
        args: [householdId]
      }),
      db.execute({
        sql: `
          SELECT b.category, b.limit_amount, COALESCE(SUM(t.amount), 0) as spent
          FROM budgets b
          LEFT JOIN transactions t ON t.category = b.category 
            AND t.household_id = b.household_id
            AND t.type IN ('despesa', 'renda') AND t.date >= ?
          WHERE b.household_id = ?
          GROUP BY b.category, b.limit_amount
        `,
        args: [monthStart, householdId]
      }),
      db.execute({
        sql: `SELECT SUM(value) as total FROM assets WHERE household_id = ?`,
        args: [householdId]
      }),
      db.execute({
        sql: `SELECT SUM(remaining_amount) as total FROM debts WHERE household_id = ? AND status = 'pending'`,
        args: [householdId]
      }),
      db.execute({
        sql: `SELECT name, target_amount, saved_amount FROM goals WHERE household_id = ? ORDER BY created_at DESC LIMIT 5`,
        args: [householdId]
      }),
      db.execute({
        sql: `SELECT name, type, current_balance FROM accounts WHERE household_id = ? ORDER BY current_balance DESC LIMIT 5`,
        args: [householdId]
      }),
      db.execute({
        sql: `SELECT COUNT(*) as pending_housing FROM rentals WHERE household_id = ? AND status = 'pendente'`,
        args: [householdId]
      }),
      db.execute({
        sql: `SELECT COUNT(*) as unread_count FROM notifications WHERE household_id = ? AND read = 0`,
        args: [householdId]
      })
    ]);

    const userName = userRes.rows[0]?.name || 'Utilizador';
    const summary = summaryRes.rows[0] || { receitas: 0, despesas: 0 };
    const recentTx = recentTxRes.rows;
    const budgets = budgetsRes.rows;
    const assets = assetsRes.rows[0];
    const liabs = liabsRes.rows[0];
    const goals = goalsRes.rows.map((goal) => ({
      ...goal,
      progress: Math.min(100, Math.round((Number(goal.saved_amount || 0) / Math.max(1, Number(goal.target_amount || 1))) * 100))
    }));
    const accounts = accountsRes.rows;
    const overdueBudgets = budgets.filter((budget) => Number(budget.spent) > Number(budget.limit_amount));
    const monthlyIncome = Number(summary.receitas || 0);
    const monthlyExpenses = Number(summary.despesas || 0);
    const debtTotal = Number(liabs?.total || 0);
    const assetsTotal = Number(assets?.total || 0);
    const cashAvailable = accounts.reduce((sum, account) => sum + Number(account.current_balance || 0), 0);
    const pendingHousing = Number(housingRes.rows[0]?.pending_housing || 0);
    const unreadNotifications = Number(notificationsRes.rows[0]?.unread_count || 0);
    const priority = buildPrioritySummary({
      monthlyIncome,
      monthlyExpenses,
      debtTotal,
      overdueBudgets,
      goals,
      cashAvailable,
      pendingHousing,
      unreadNotifications
    });

    return {
      text: formatUserContextText({
        userName,
        monthlyIncome,
        monthlyExpenses,
        netMonth: monthlyIncome - monthlyExpenses,
        debtTotal,
        assetsTotal,
        cashAvailable,
        pendingHousing,
        unreadNotifications,
        priority,
        recentTx,
        budgets,
        overdueBudgets,
        goals,
        format
      }),
      summary: {
        userName,
        monthlyIncome,
        monthlyExpenses,
        debtTotal,
        assetsTotal,
        cashAvailable,
        pendingHousing,
        unreadNotifications,
        overdueBudgetCount: overdueBudgets.length,
        topOverBudgetCategory: overdueBudgets[0]?.category || null,
        goalCount: goals.length,
        topGoalName: goals.find((goal) => goal.progress < 100)?.name || null,
        priority
      }
    };
  } catch (err) {
    console.error('[buildUserContext] Error:', err);
    return {
      text: 'Dados financeiros não disponíveis de momento.',
      summary: {
        userName: 'Utilizador',
        monthlyIncome: 0,
        monthlyExpenses: 0,
        debtTotal: 0,
        assetsTotal: 0,
        cashAvailable: 0,
        pendingHousing: 0,
        unreadNotifications: 0,
        overdueBudgetCount: 0,
        topOverBudgetCategory: null,
        goalCount: 0,
        topGoalName: null,
        priority: {
          priority: 'entender melhor a situação actual',
          reason: 'faltam dados suficientes',
          nextAction: 'pedir uma leitura geral da tua situação financeira'
        }
      }
    };
  }
}

// ─── Multi-Provider Configuration ─────────────────────────────────────────────
const PROVIDERS = {
  gemini: {
    url: (key) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    headers: () => ({ 'Content-Type': 'application/json' }),
    body: (messages, system, tools = []) => ({
      system_instruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      tools: tools.length > 0 ? [{ functionDeclarations: tools.map(t => t.function) }] : undefined,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    }),
    extract: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text,
    extractToolCall: (data) => {
      const call = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;
      return call ? { name: call.name, args: call.args } : null;
    }
  },

  groq: {
    url: () => 'https://api.groq.com/openai/v1/chat/completions',
    headers: (key) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }),
    body: (messages, system, tools = []) => ({
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      messages: [{ role: 'system', content: system }, ...messages],
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined
    }),
    extract: (data) => data.choices?.[0]?.message?.content,
    extractToolCall: (data) => {
      const call = data.choices?.[0]?.message?.tool_calls?.[0]?.function;
      return call ? { name: call.name, args: JSON.parse(call.arguments || '{}') } : null;
    }
  },

  openrouter: {
    url: () => 'https://openrouter.ai/api/v1/chat/completions',
    headers: (key) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://mwanga.app',
      'X-Title': 'Mwanga Binth'
    }),
    body: (messages, system, tools = []) => ({
      model: 'meta-llama/llama-3.1-8b-instruct',
      temperature: 0.7,
      messages: [{ role: 'system', content: system }, ...messages],
      tools: tools.length > 0 ? tools : undefined
    }),
    extract: (data) => data.choices?.[0]?.message?.content,
    extractToolCall: (data) => {
      const call = data.choices?.[0]?.message?.tool_calls?.[0]?.function;
      return call ? { name: call.name, args: JSON.parse(call.arguments || '{}') } : null;
    }
  }
};

const disabledProviders = new Map();

function isProviderTemporarilyDisabled(provider) {
  const disabledUntil = disabledProviders.get(provider);

  if (!disabledUntil) {
    return false;
  }

  if (disabledUntil <= Date.now()) {
    disabledProviders.delete(provider);
    return false;
  }

  return true;
}

function disableProviderTemporarily(provider, minutes = 15) {
  disabledProviders.set(provider, Date.now() + (minutes * 60 * 1000));
}

function isAuthFailure(errorMessage) {
  const text = (errorMessage || '').toLowerCase();
  return text.includes('http 401') || text.includes('user not found') || text.includes('invalid api key');
}

// ─── Fallback Response ─────────────────────────────────────────────────────────
function getFallbackResponse(userMessage, contextSummary = {}) {
  const lower = (userMessage || '').toLowerCase();
  const qActions = ['Verificar orçamento', 'Analisar dívidas', 'Ver metas'];
  const name = contextSummary.userName || 'Olá';
  const priorityLine = contextSummary.priority?.nextAction ? `A prioridade agora é ${contextSummary.priority.priority}: ${contextSummary.priority.nextAction}.` : '';
  const budgetLine = contextSummary.topOverBudgetCategory ? `A categoria que mais merece atenção é ${contextSummary.topOverBudgetCategory}.` : '';

  if (lower.includes('poupan') || lower.includes('poupar')) {
    return { 
      message: `Olá ${name}! Vejo interesse em poupança. ${contextSummary.topGoalName ? `A meta mais viva agora é ${contextSummary.topGoalName}. ` : ''}${priorityLine}`.trim(), 
      insight_type: 'opportunity', 
      quick_actions: qActions, 
      data: null 
    };
  }
  if (lower.includes('orçamento') || lower.includes('gasto')) {
    return { 
      message: `Olá ${name}! ${budgetLine || 'Posso ajudar-te a ver onde o orçamento está mais apertado este mês.'} ${priorityLine}`.trim(), 
      insight_type: contextSummary.overdueBudgetCount > 0 ? 'warning' : 'info', 
      quick_actions: qActions, 
      data: null 
    };
  }
  return { 
    message: `Olá ${name}! ${priorityLine || 'Estou pronta para te ajudar com base no teu estado financeiro real.'} ${budgetLine}`.trim(), 
    insight_type: 'info', 
    quick_actions: qActions, 
    data: null 
  };
}

// ─── Main Caller with Fallback ─────────────────────────────────────────────────
async function callBinth({ messages, apiKey, provider = 'gemini', householdId, userId }) {
  const userContext = await buildUserContext(householdId, userId);
  const system = BINTH_SYSTEM_PROMPT.replace('{user_context}', userContext.text);

  // Try preferred provider first, then fall back
  const order = [provider, ...Object.keys(PROVIDERS).filter(p => p !== provider)];

  for (const p of order) {
    if (!apiKey && isProviderTemporarilyDisabled(p)) {
      continue;
    }

    // Resolve which key to use for the provider
    let activeKey = apiKey;
    if (!activeKey) {
      if (p === 'openrouter') activeKey = process.env.OPENROUTER_API_KEY;
      if (p === 'gemini') activeKey = process.env.GEMINI_API_KEY;
      if (p === 'groq') activeKey = process.env.GROQ_API_KEY;
    }

    if (!activeKey) continue;

    const config = PROVIDERS[p];
    try {
      const hdrs = config.headers(activeKey);
      const tools = ToolRegistry.getToolsSchema();
      const payload = config.body(messages, system, tools);
      
      const res = await fetch(config.url(activeKey), {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000) // Shorter timeout to prevent 502
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 100)}`);
      }

      const data = await res.json();
      const raw = config.extract(data) || '';
      
      // -- TOOL CALL INTERCEPTION (AGENT LOOP V2) --
      const toolCall = config.extractToolCall(data);
      if (toolCall) {
        logger.info({ tool: toolCall.name }, 'Binth AI requested tool call');
        const toolResult = await ToolRegistry.executeTool(toolCall.name, { householdId, ...toolCall.args });
        
        const nextMessages = [
          ...messages,
          { role: 'assistant', content: raw }, 
          { role: 'user', content: `RESULTADO DA FERRAMENTA (${toolCall.name}): ${JSON.stringify(toolResult.data)}. Agora responde ao utilizador com base nisto de forma natural.` }
        ];

        const res2 = await fetch(config.url(activeKey), {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify(config.body(nextMessages, system)),
          signal: AbortSignal.timeout(10000)
        });

        if (res2.ok) {
          const data2 = await res2.json();
          return parseBinthResponse(config.extract(data2) || '', userContext.summary);
        }
      }
      
      return parseBinthResponse(raw, userContext.summary);

    } catch (err) {
      if (!apiKey && isAuthFailure(err.message)) {
        disableProviderTemporarily(p);
        logger.warn({ provider: p }, 'Binth provider temporarily disabled after auth failure');
        continue;
      }

      logger.warn({ provider: p, error: err.message }, 'Binth provider call failed');
    }
  }

  logger.warn('All Binth providers failed. Using fallback response.');
  return getFallbackResponse(messages[messages.length - 1]?.content || '', userContext.summary);
}

/**
 * Helper para limpar e converter a resposta bruta do LLM no formato JSON esperado.
 */
function getSafeUserName(name) {
  const trimmed = String(name || '').trim();

  if (!trimmed) return '';
  if (/^\[(nome|name)\]$/i.test(trimmed)) return '';
  if (/^[<{[](nome|name)[>}]\s*$/i.test(trimmed)) return '';

  return trimmed;
}

function buildGreeting(name) {
  return name ? `Olá ${name}!` : 'Olá!';
}

function personalizeBinthPayload(payload, contextSummary = {}) {
  const safeName = getSafeUserName(contextSummary.userName);
  const greeting = buildGreeting(safeName);
  const placeholderPattern = /\[(nome|name)\]|\{(nome|name)\}|<(nome|name)>/gi;

  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  if (typeof payload.message === 'string') {
    let nextMessage = payload.message.replace(placeholderPattern, safeName || '');
    nextMessage = nextMessage.replace(/\s{2,}/g, ' ').trim();

    if (safeName && /\b(?:olá|ola)\s*!/i.test(nextMessage)) {
      nextMessage = nextMessage.replace(/\b(?:olá|ola)\s*!/i, greeting);
    }

    payload.message = nextMessage || greeting;
  }

  return payload;
}

function parseBinthResponse(raw, contextSummary = {}) {
  let clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const jsonStart = clean.indexOf('{');
  const jsonEnd = clean.lastIndexOf('}');

  if (jsonStart !== -1 && jsonEnd !== -1) {
    const potentialJson = clean.slice(jsonStart, jsonEnd + 1);
    try {
      return personalizeBinthPayload(JSON.parse(potentialJson), contextSummary);
    } catch(e) {
      logger.debug({ error: e.message, raw: clean }, 'Binth JSON parse error');
    }
  }

  return personalizeBinthPayload({
    message: clean.length > 5 ? clean : "Estou a processar os teus dados...",
    insight_type: "info",
    quick_actions: [],
    data: null
  }, contextSummary);
}

module.exports = { callBinth, buildUserContext };
