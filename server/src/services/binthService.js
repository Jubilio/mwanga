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
async function buildUserContext(householdId, userId) {
  try {
    const fmt = (n) => Number(n || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 });
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Fetch all context data in parallel
    const [userRes, summaryRes, recentTxRes, budgetsRes, assetsRes, liabsRes] = await Promise.all([
      db.execute({
        sql: 'SELECT name FROM users WHERE id = ?',
        args: [userId]
      }),
      db.execute({
        sql: `
          SELECT 
            SUM(CASE WHEN type = 'receita' THEN amount ELSE 0 END) as receitas,
            SUM(CASE WHEN type = 'despesa' THEN amount ELSE 0 END) as despesas
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
            AND t.type = 'despesa' AND t.date >= ?
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
      })
    ]);

    const userName = userRes.rows[0]?.name || 'Utilizador';
    const summary = summaryRes.rows[0] || { receitas: 0, despesas: 0 };
    const recentTx = recentTxRes.rows;
    const budgets = budgetsRes.rows;
    const assets = assetsRes.rows[0];
    const liabs = liabsRes.rows[0];

    return `
NOME DO UTILIZADOR: ${userName}

=== ESTADO FINANCEIRO ACTUAL ===
TENS NESTE MÊS: Receitas MT ${fmt(summary.receitas)} | Despesas MT ${fmt(summary.despesas)}
BALANÇO PATRIMONIAL: Activos MT ${fmt(assets?.total)} | Dívidas MT ${fmt(liabs?.total)}

ÚLTIMAS TRANSAÇÕES:
${recentTx.map(t => `- [${t.date}] ${t.description}: MT ${fmt(t.amount)} (${t.type === 'receita' ? '+' : '-'}) [${t.category}]`).join('\n') || '- Nenhuma transação recente.'}

ORÇAMENTOS ACTIVOS:
${budgets.length > 0 ? budgets.map(b => `- ${b.category}: MT ${fmt(b.spent)} / MT ${fmt(b.limit_amount)}`).join('\n') : '- Nenhum orçamento.'}
    `.trim();
  } catch (err) {
    console.error('[buildUserContext] Error:', err);
    return 'Dados financeiros não disponíveis de momento.';
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

// ─── Fallback Response ─────────────────────────────────────────────────────────
function getFallbackResponse(userMessage) {
  const lower = (userMessage || '').toLowerCase();
  const qActions = ['Verificar orçamento', 'Assinar para receber atualizações', 'Ver mais'];

  if (lower.includes('poupan') || lower.includes('poupar')) {
    return { 
      message: 'Olá! Reparei no teu interesse em poupança. Poupar 20% do rendimento é um excelente ponto de partida. Queres que eu analise o teu progresso em relação às tuas metas?', 
      insight_type: 'opportunity', 
      quick_actions: qActions, 
      data: null 
    };
  }
  if (lower.includes('orçamento') || lower.includes('gasto')) {
    return { 
      message: 'Olá! Gerir o orçamento é a chave para o sucesso financeiro. Recomendo a regra 50/30/20. Queres ver como estão as tuas categorias este mês?', 
      insight_type: 'info', 
      quick_actions: qActions, 
      data: null 
    };
  }
  return { 
    message: 'Olá! Estou aqui para ajudar com a tua saúde financeira. Podes perguntar-me sobre o teu saldo, metas ou como poupar mais este mês! 😊', 
    insight_type: 'info', 
    quick_actions: qActions, 
    data: null 
  };
}

// ─── Main Caller with Fallback ─────────────────────────────────────────────────
async function callBinth({ messages, apiKey, provider = 'gemini', householdId, userId }) {
  const userContext = await buildUserContext(householdId, userId);
  const system = BINTH_SYSTEM_PROMPT.replace('{user_context}', userContext);

  // Try preferred provider first, then fall back
  const order = [provider, ...Object.keys(PROVIDERS).filter(p => p !== provider)];

  for (const p of order) {
    // Resolve which key to use for the provider
    let activeKey = apiKey;
    if (!activeKey) {
      if (p === 'openrouter') activeKey = process.env.OPENROUTER_API_KEY;
      if (p === 'gemini') activeKey = process.env.GEMINI_API_KEY;
      if (p === 'groq') activeKey = process.env.GROQ_API_KEY;
    }

    if (!activeKey && p !== 'openrouter') continue;

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
          return parseBinthResponse(config.extract(data2) || '');
        }
      }
      
      return parseBinthResponse(raw);

    } catch (err) {
      logger.warn({ provider: p, error: err.message }, 'Binth provider call failed');
    }
  }

  logger.warn('All Binth providers failed. Using fallback response.');
  return getFallbackResponse(messages[messages.length - 1]?.content || '');
}

/**
 * Helper para limpar e converter a resposta bruta do LLM no formato JSON esperado.
 */
function parseBinthResponse(raw) {
  let clean = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  const jsonStart = clean.indexOf('{');
  const jsonEnd = clean.lastIndexOf('}');

  if (jsonStart !== -1 && jsonEnd !== -1) {
    const potentialJson = clean.slice(jsonStart, jsonEnd + 1);
    try {
      return JSON.parse(potentialJson);
    } catch(e) {
      logger.debug({ error: e.message, raw: clean }, 'Binth JSON parse error');
    }
  }

  return {
    message: clean.length > 5 ? clean : "Estou a processar os teus dados...",
    insight_type: "info",
    quick_actions: [],
    data: null
  };
}

module.exports = { callBinth, buildUserContext };
