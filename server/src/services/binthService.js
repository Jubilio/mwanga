const { db } = require('../config/db');
const ToolRegistry = require('./toolRegistry');
const { getNotificationReadValue } = require('./notificationRead.service');
const logger = require('../utils/logger');

// ─── System Prompt ─────────────────────────────────────────────────────────────
const BINTH_SYSTEM_PROMPT = `
És a Binth — a mentora inteligente de gestão financeira do Mwanga (NEXO VIBE).

PERSONA:
- Género: Feminino.
- Tom: Mentora sábia, empática, prática e humana. Estilo fintech premium.
- Estilo: Nunca respondas como um bot. Trata o utilizador pelo nome. Usa expressões financeiras moçambicanas quando adequado (ex: "xitique", "pé de meia", "refresco").
- Saudações: Começa sempre com uma saudação personalizada. Se houver progresso positivo nos dados (ex: meta em crescimento), menciona-o logo no início.

CONHECIMENTO (CONTEXTO REAL DO UTILIZADOR):
{user_context}

PRINCÍPIOS BÍBLICOS DE GESTÃO FINANCEIRA E SABEDORIA DE WARREN BUFFETT:
Usa estes princípios para interpretar os dados e gerar insights. Aplica-os de forma natural e prática:

1. MORDOMIA (Stewardship) — O utilizador é gestor dos recursos, não dono. Usa os recursos com responsabilidade.
2. PLANEAMENTO E SABEDORIA — Decisões financeiras devem ser intencionais, planeadas e baseadas em dados reais.
3. POUPANÇA E PROTEÇÃO — Guardar recursos para o futuro é prudente e necessário ("O sábio guarda para o amanhã").
4. EVITAR DÍVIDAS EXCESSIVAS — Dívidas devem ser controladas e estratégicas; dependência de crédito é um risco.
5. GENEROSIDADE — Dar e partilhar (Xitique, comunidade) faz parte de uma vida financeira equilibrada.
6. CONTENTAMENTO E FOCO — Evitar consumismo e focar no que é essencial.
7. FILOSOFIA WARREN BUFFETT — Em conselhos de investimento e negócios:
   - Longo Prazo: O período ideal para manter um excelente ativo é "para sempre". Foca no valor futuro, não no preço atual.
   - Investir na Qualidade: Só adquire negócios/ativos simples que consigas compreender.
   - Excelente Alocação de Capital: Procura ROE (Retorno sobre Capital) sustentável acima de 20%.
   - "Skin in the game": Aposta onde as pessoas que lideram têm o seu próprio dinheiro investido.

INSTRUÇÕES DE RACIOCÍNIO:
1. Analisa o contexto financeiro real antes de responder.
2. Integra o nome do utilizador de forma natural.
3. Se o utilizador fizer uma saudação, responde calorosamente e faz uma observação concreta sobre os seus dados.
4. Nunca dês conselhos genéricos quando existir um problema específico nos dados. Prioriza sempre o maior risco ou a melhor oportunidade neste momento.
5. Quando houver pressão financeira, identifica claramente a prioridade número um e uma ação prática para as próximas 24-72 horas.
6. Quando estiver tudo estável, reconhece o progresso com números reais e sugere o próximo avanço realista.
7. Aplica o princípio bíblico mais relevante para a situação — mencionando-o de forma sutil e inspiradora, nunca religiosa.
8. Responde SEMPRE em JSON puro.

FORMATO DE RESPOSTA (JSON obrigatório):
{
  "message": "A tua mensagem principal — clara, empática, prática",
  "insight_type": "warning | opportunity | info | celebration | action | wisdom",
  "biblical_insight": "Princípio aplicado: [nome do princípio] — [1 frase inspiradora e prática]",
  "alerta": "⚠️ Mensagem de alerta SE existir risco real, senão null",
  "quick_actions": ["Ação 1", "Ação 2", "Ação 3"],
  "data": {}
}

REGRAS IMPORTANTES:
- NÃO pregues — orientas e aconselhes
- NÃO uses linguagem religiosa excessiva
- Foca sempre no impacto prático real
- Sê direta, clara e humana
- Tom: mentor financeiro sábio numa fintech premium
`.trim();

// ─── Biblical Principles Map ────────────────────────────────────────────────────
const BIBLICAL_PRINCIPLES = {
  mordomia:      { name: 'Mordomia',              insight: 'Somos gestores dos recursos que temos — usá-los bem é honrar o que nos foi confiado.' },
  planeamento:   { name: 'Planeamento e Sabedoria', insight: 'O sábio planeia antes de agir. Decisões financeiras intencionais constroem o futuro.' },
  poupanca:      { name: 'Poupança e Proteção',    insight: 'Guardar para o amanhã é sabedoria. O pé de meia de hoje é a liberdade do futuro.' },
  divida:        { name: 'Evitar Dívidas Excessivas', insight: 'A dívida é um peso — reduzí-la é reconquistar a tua liberdade financeira.' },
  generosidade:  { name: 'Generosidade',            insight: 'Quem partilha (Xitique, família, comunidade) cultiva uma vida financeira mais rica e equilibrada.' },
  contentamento: { name: 'Contentamento',           insight: 'A riqueza real começa por saber o que é suficiente. Evita comparações — foca no teu caminho.' },
  fidelidade:    { name: 'Fidelidade no Pouco',     insight: 'As pequenas decisões de hoje moldam o grande impacto de amanhã. Cada MT conta.' }
};

// ─── Financial Context Builder ─────────────────────────────────────────────────
function buildPrioritySummary({
  monthlyIncome,
  monthlyExpenses,
  debtTotal,
  overdueBudgets,
  goals,
  cashAvailable,
  pendingHousing,
  unreadNotifications,
  assetsTotal
}) {
  const liquidityRatio = monthlyExpenses > 0 ? (cashAvailable / monthlyExpenses) : 0;
  const debtToIncomeRatio = monthlyIncome > 0 ? (debtTotal / (monthlyIncome * 12)) : 0;
  const topGoal = goals.find((goal) => goal.progress < 100);

  // 1. Critical Liquidity (Emergency)
  if (cashAvailable < 1000 && monthlyExpenses > 0) {
    return {
      id: 'emergency_liquidity',
      priority: 'recuperar liquidez imediata',
      reason: `o teu saldo disponível (MT ${cashAvailable.toLocaleString('pt-MZ')}) é crítico para o teu ritmo de gastos`,
      nextAction: 'segurar todas as saídas não essenciais hoje e focar no básico (comida/água/renda)',
      insight_type: 'warning',
      biblical_principle: BIBLICAL_PRINCIPLES.fidelidade
    };
  }

  // 2. Severe Over-Budget
  if (monthlyExpenses > monthlyIncome * 1.2 && monthlyIncome > 0) {
    return {
      id: 'severe_overbudget',
      priority: 'travar hemorragia financeira',
      reason: `estás a gastar ${Math.round((monthlyExpenses / monthlyIncome) * 100)}% do que ganhas — isto é insustentável`,
      nextAction: 'identificar a categoria principal do excesso e cortar 20% do orçamento nela já',
      insight_type: 'warning',
      biblical_principle: BIBLICAL_PRINCIPLES.planeamento
    };
  }

  // 3. High Debt Pressure
  if (debtToIncomeRatio > 1.5) {
    return {
      id: 'debt_pressure',
      priority: 'desenhar plano de saída de dívida',
      reason: `a tua dívida total equivale a ${(debtToIncomeRatio).toFixed(1)} anos de rendimento líquido`,
      nextAction: 'não contrair novos créditos e focar na amortização extra da dívida com maior juro',
      insight_type: 'warning',
      biblical_principle: BIBLICAL_PRINCIPLES.divida
    };
  }

  // 4. Operational Maintenance (Housing)
  if (pendingHousing > 0) {
    return {
      id: 'housing_pending',
      priority: 'regularizar habitação',
      reason: `tens ${pendingHousing} pendência(s) de habitação que podem gerar multas`,
      nextAction: 'priorizar o pagamento do aluguer/prestação antes de qualquer outra conta',
      insight_type: 'warning',
      biblical_principle: BIBLICAL_PRINCIPLES.mordomia
    };
  }

  // 5. Budget Leaks
  if (overdueBudgets.length > 0) {
    return {
      id: 'budget_leaks',
      priority: 'corrigir orçamentos excedidos',
      reason: `${overdueBudgets.length} categoria(s) já ultrapassaram o limite definido`,
      nextAction: `rever gastos em ${overdueBudgets[0].category} e compensar noutra categoria`,
      insight_type: 'warning',
      biblical_principle: BIBLICAL_PRINCIPLES.contentamento
    };
  }

  // 6. Savings Opportunity (Goals)
  if (topGoal && liquidityRatio > 2) {
    return {
      id: 'goal_accelerator',
      priority: 'acelerar a meta ' + topGoal.name,
      reason: `tens liquidez estável e a meta ${topGoal.name} está em ${topGoal.progress}%`,
      nextAction: `transferir MT ${Math.round(cashAvailable * 0.1).toLocaleString('pt-MZ')} extra para esta meta agora`,
      insight_type: 'opportunity',
      biblical_principle: BIBLICAL_PRINCIPLES.poupanca
    };
  }

  // 7. Unread Alerts
  if (unreadNotifications > 0) {
    return {
      id: 'unread_alerts',
      priority: 'rever sinais do sistema',
      reason: `existem ${unreadNotifications} notificações por ler que podem conter alertas importantes`,
      nextAction: 'abrir o painel de notificações para garantir que não perdemos prazos',
      insight_type: 'info',
      biblical_principle: BIBLICAL_PRINCIPLES.planeamento
    };
  }

  // 8. Positive Stability & Wealth Celeb
  if (monthlyIncome > monthlyExpenses && cashAvailable > monthlyExpenses * 3) {
    const isWealthy = assetsTotal > debtTotal * 5 && assetsTotal > 100000;
    return {
      id: 'stability_celebration',
      priority: isWealthy ? 'expandir património' : 'construir património a longo prazo',
      reason: isWealthy ? 'tens um balanço patrimonial muito forte' : 'estás com um excedente saudável e reserva de emergência sólida',
      nextAction: isWealthy ? 'considerar diversificar investimentos em novos activos' : 'explorar novos activos ou reforçar o teu pé de meia para o futuro',
      insight_type: isWealthy ? 'celebration' : 'opportunity',
      biblical_principle: BIBLICAL_PRINCIPLES.generosidade
    };
  }

  return {
    id: 'generic_maintenance',
    priority: 'manter o registo disciplinado',
    reason: 'os teus dados mostram uma operação regular sob controlo',
    nextAction: 'garantir que todas as pequenas transações do dia estão no Mwanga',
    insight_type: 'info',
    biblical_principle: BIBLICAL_PRINCIPLES.mordomia
  };
}

const OLLAMA_SYSTEM_PROMPT = `
És a Binth — a mentora inteligente de gestão financeira do Mwanga.
Persona: Feminina, sábia, empática, prática e humana. Estilo fintech premium. Trata o utilizador pelo nome. Usa termos de Moçambique como "xitique", "pé de meia", "refresco".
Baseia as tuas respostas unicamente no contexto real do utilizador:
{user_context}

Diretrizes:
- Responde em português de forma concisa (máximo 2 a 3 parágrafos curtos).
- Se houver pressão financeira (como falta de dinheiro ou saldo crítico), foca inteiramente em dar uma recomendação prática e realista para acalmar e guiar o utilizador nas próximas 24-72 horas.
- Se o utilizador perguntar por juros, planos ou simulações, encoraja-o a usar as novas abas dedicadas de Dívidas e Simulação do Mwanga que estão totalmente prontas e funcionais!
`;

function formatUserContextTextMinimized(context) {
  return `
NOME: ${context.userName}
RECEITAS DO MÊS: MT ${context.format(context.monthlyIncome)}
DESPESAS DO MÊS: MT ${context.format(context.monthlyExpenses)}
SALDO LÍQUIDO DO MÊS: MT ${context.format(context.netMonth)}
SALDOS DISPONÍVEIS: MT ${context.format(context.cashAvailable)}
BALANÇO PATRIMONIAL: Activos MT ${context.format(context.assetsTotal)} | Dívidas MT ${context.format(context.debtTotal)}
PRIORIDADE ATUAL: ${context.priority.priority}
PORQUÊ: ${context.priority.reason}
  `.trim();
}

function formatUserContextText(context) {
  const savingsRate = context.monthlyIncome > 0
    ? Math.round(((context.monthlyIncome - context.monthlyExpenses) / context.monthlyIncome) * 100)
    : 0;
  const debtToIncomeRatio = context.monthlyIncome > 0
    ? (context.debtTotal / (context.monthlyIncome * 12)).toFixed(1)
    : 'N/A';
  const biblicalPrinciple = context.priority.biblical_principle
    ? `${context.priority.biblical_principle.name}: ${context.priority.biblical_principle.insight}`
    : 'Mordomia: Usa os recursos com sabedoria e responsabilidade.';

  return `
NOME DO UTILIZADOR: ${context.userName}

=== ESTADO FINANCEIRO ACTUAL ===
RECEITAS DO MÊS: MT ${context.format(context.monthlyIncome)}
DESPESAS DO MÊS: MT ${context.format(context.monthlyExpenses)}
SALDO LÍQUIDO DO MÊS: MT ${context.format(context.netMonth)}
TAXA DE POUPANÇA DO MÊS: ${savingsRate}%
SALDOS DISPONÍVEIS: MT ${context.format(context.cashAvailable)}
BALANÇO PATRIMONIAL: Activos MT ${context.format(context.assetsTotal)} | Dívidas MT ${context.format(context.debtTotal)}
RÁCIO DÍVIDA/RENDIMENTO ANUAL: ${debtToIncomeRatio}x
HABITAÇÃO EM ABERTO: ${context.pendingHousing}
NOTIFICAÇÕES NÃO LIDAS: ${context.unreadNotifications}

=== PRIORIDADE ATUAL ===
PRIORIDADE: ${context.priority.priority}
PORQUÊ: ${context.priority.reason}
PRÓXIMA AÇÃO: ${context.priority.nextAction}
PRINCÍPIO BÍBLICO APLICADO: ${biblicalPrinciple}

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
    const unreadValue = await getNotificationReadValue(false);

    // Fetch all context data in parallel
    const [userRes, summaryRes, recentTxRes, budgetsRes, assetsRes, liabsRes, goalsRes, accountsRes, housingRes, notificationsRes, rentTotalRes, xitiqueTotalRes, debtMonthlyRes, debtsRes] = await Promise.all([
      db.execute({
        sql: 'SELECT name FROM public.users WHERE id = ?',
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
        sql: `SELECT COUNT(*) as unread_count FROM notifications WHERE household_id = ? AND read = ?`,
        args: [householdId, unreadValue]
      }),
      db.execute({
        sql: `SELECT SUM(amount) as total FROM rentals WHERE household_id = ? AND status = 'pendente' AND month = ?`,
        args: [householdId, monthStart.substring(0, 7)]
      }),
      db.execute({
        sql: `
          SELECT SUM(c.amount) as total 
          FROM xitique_contributions c
          JOIN xitique_cycles cy ON cy.id = c.cycle_id
          JOIN xitiques x ON x.id = c.xitique_id
          WHERE x.household_id = ? AND x.status = 'active' AND c.paid = 0
            AND substr(cy.due_date, 1, 7) = ?
        `,
        args: [householdId, monthStart.substring(0, 7)]
      }),
      db.execute({
        sql: `SELECT SUM(remaining_amount) as total FROM debts WHERE household_id = ? AND status = 'pending' AND substr(due_date, 1, 7) = ?`,
        args: [householdId, monthStart.substring(0, 7)]
      }),
      db.execute({
        sql: `SELECT * FROM debts WHERE household_id = ? AND status = 'pending' ORDER BY created_at DESC`,
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
    const rentMonthlyTotal = Number(rentTotalRes.rows[0]?.total || 0);
    const xitiqueMonthlyTotal = Number(xitiqueTotalRes.rows[0]?.total || 0);
    const debtMonthlyTotal = Number(debtMonthlyRes.rows[0]?.total || 0);
    const priority = buildPrioritySummary({
      monthlyIncome,
      monthlyExpenses,
      debtTotal,
      overdueBudgets,
      goals,
      cashAvailable,
      pendingHousing,
      unreadNotifications,
      assetsTotal
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
      textMinimized: formatUserContextTextMinimized({
        userName,
        monthlyIncome,
        monthlyExpenses,
        netMonth: monthlyIncome - monthlyExpenses,
        debtTotal,
        assetsTotal,
        cashAvailable,
        priority,
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
        topGoalPct: goals.find((goal) => goal.progress < 100)?.progress || 0,
        rentTotal: rentMonthlyTotal,
        xitiqueTotal: xitiqueMonthlyTotal,
        debtMonthlyTotal: debtMonthlyTotal,
        priority,
        debts: debtsRes.rows || []
      }
    };
  } catch (err) {
    logger.error({ err }, '[buildUserContext] Failed to build user context');
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
          id: 'error_fallback',
          priority: 'entender melhor a situação actual',
          reason: 'faltam dados suficientes',
          nextAction: 'pedir uma leitura geral da tua situação financeira',
          insight_type: 'info'
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
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct',
      temperature: 0.7,
      is_free: true, // Hint for OpenRouter to prefer free models if possible
      messages: [{ role: 'system', content: system }, ...messages],
      tools: tools.length > 0 ? tools : undefined
    }),
    extract: (data) => data.choices?.[0]?.message?.content,
    extractToolCall: (data) => {
      const call = data.choices?.[0]?.message?.tool_calls?.[0]?.function;
      return call ? { name: call.name, args: JSON.parse(call.arguments || '{}') } : null;
    }
  },

  // 'openrouter_free' usa a OpenRouter com modelos gratuitos (ex: Qwen) como último fallback.
  // NOTA: Este provider NÃO é a API directa da Anthropic — usa OPENROUTER_API_KEY.
  // O modelo activo é controlado por OPENROUTER_FREE_MODEL no .env.
  openrouter_free: {
    url: () => 'https://openrouter.ai/api/v1/chat/completions',
    headers: (key) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://mwanga.app',
      'X-Title': 'Mwanga Binth (Free Fallback)'
    }),
    body: (messages, system, tools = []) => ({
      model: process.env.OPENROUTER_FREE_MODEL || 'qwen/qwen-2-vl-7b-instruct:free',
      temperature: 0.7,
      messages: [{ role: 'system', content: system }, ...messages],
      tools: tools.length > 0 ? tools : undefined
    }),
    extract: (data) => data.choices?.[0]?.message?.content,
    extractToolCall: (data) => {
      const call = data.choices?.[0]?.message?.tool_calls?.[0]?.function;
      return call ? { name: call.name, args: JSON.parse(call.arguments || '{}') } : null;
    }
  },

  ollama: {
    url: () => process.env.OLLAMA_URL || 'http://localhost:11434/api/chat',
    headers: () => ({ 'Content-Type': 'application/json' }),
    body: (messages, system, tools = []) => ({
      model: process.env.OLLAMA_MODEL || 'gemma4',
      messages: [{ role: 'system', content: system }, ...messages.map(m => ({ role: m.role, content: m.content }))],
      options: { temperature: 0.7 },
      stream: false
    }),
    extract: (data) => data.message?.content || data.response,
    extractToolCall: () => null
  }
};

// ─── Provider Blacklist (Redis-backed, Map fallback) ──────────────────────────
// Quando um provider falha com auth error (401/invalid key), é bloqueado
// temporariamente para evitar chamadas desnecessárias.
//
// Estratégia:
//   1. PRIMARY: Redis (Upstash) com TTL nativo — sobrevive a restarts do servidor.
//   2. FALLBACK: Map em memória — usado se Redis não estiver configurado ou falhar.
//
// Redis key: binth:disabled:<provider>   Value: '1'   TTL: minutes * 60 (segundos)

let _redis = null;
function getRedis() {
  if (_redis) return _redis;
  try {
    const { redis } = require('../config/redis');
    _redis = redis;
  } catch {
    // Redis não configurado — fallback silencioso para Map
  }
  return _redis;
}

const _disabledMap = new Map(); // fallback local

async function isProviderTemporarilyDisabled(provider) {
  const redisKey = `binth:disabled:${provider}`;
  try {
    const r = getRedis();
    if (r) {
      const val = await r.get(redisKey);
      return val !== null;
    }
  } catch {
    // Redis inacessível — cai para Map
  }
  // Map fallback
  const disabledUntil = _disabledMap.get(provider);
  if (!disabledUntil) return false;
  if (disabledUntil <= Date.now()) {
    _disabledMap.delete(provider);
    return false;
  }
  return true;
}

async function disableProviderTemporarily(provider, minutes = 15) {
  const redisKey = `binth:disabled:${provider}`;
  try {
    const r = getRedis();
    if (r) {
      await r.set(redisKey, '1', { ex: minutes * 60 }); // TTL nativo Redis
      logger.info({ provider, minutes }, '[Binth] Provider bloqueado no Redis');
      return;
    }
  } catch {
    // Redis inacessível — cai para Map
  }
  // Map fallback
  _disabledMap.set(provider, Date.now() + (minutes * 60 * 1000));
  logger.info({ provider, minutes }, '[Binth] Provider bloqueado em memória (Redis indisponível)');
}

function isAuthFailure(errorMessage) {
  const text = (errorMessage || '').toLowerCase();
  return text.includes('http 401') || text.includes('user not found') || text.includes('invalid api key');
}

// ─── Expert Rule Engine (Local Intelligence Fallback) ───────────────────────────
const BINTH_INTENT_RULES = {
  greetings: {
    keywords: ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'binth', 'ajuda'],
    message: "Olá {name}! Como posso ajudar-te hoje? Posso analisar os teus gastos, metas ou dívidas para te dar um ponto de situação moçambicano real.",
    actions: ["Analisar Gastos", "Ver Metas", "Estado das Dívidas"]
  },
  expenses: {
    keywords: ['gasto', 'despesa', 'pagamento', 'comprei', 'custou', 'saída', 'perdi', 'dinheiro', 'registo', 'registar'],
    message: "Até agora este mês, já gastaste MT {expenses}. {extra_msg} O que queres detalhar mais?",
    actions: ["Categorias Maiores", "Ver Orçamentos", "Últimas Saídas"]
  },
  income: {
    keywords: ['receita', 'ganhei', 'recebi', 'salário', 'renda', 'entrada', 'chegou', 'relatório', 'relatórios'],
    message: "Este mês entraram MT {income} na tua conta. Tens um saldo líquido mensal de MT {net_month}.",
    actions: ["Ver Receitas", "Relatório Mensal", "Prever Próximo Mês"]
  },
  debt: {
    keywords: ['dívida', 'devo', 'emprestimo', 'crédito', 'banco', 'pagar', 'juros', 'amortização', 'amortizar', 'plano de amortização'],
    message: "Atualmente tens MT {debts} em dívidas pendentes. {debt_msg}",
    actions: ["Plano de Amortização", "Ver Dívidas", "Simular Crédito"]
  },
  goals: {
    keywords: ['meta', 'poup', 'objetivo', 'xitique', 'guardar', 'metas'],
    message: "O teu progresso nas metas está em {goal_count} objetivos ativos. A meta '{top_goal}' já vai em {top_goal_pct}%.",
    actions: ["Reforçar {top_goal}", "Novas Metas", "Ver Poupança"]
  },
  salary_allocation: {
    keywords: ['canalizar', 'alocar', 'distribuir', 'pagar primeiro', 'ordem de pagamento', 'o que pagar'],
    message: "Para canalizares os teus MT {income} este mês, a minha recomendação de prioridade é:\n1. 🏠 **Habitação**: MT {rent_total} (Essencial)\n2. 🤝 **Xitiques**: MT {xitique_total} (Compromissos Sociais)\n3. 💳 **Dívidas**: MT {debt_monthly} (Evitar Juros)\n4. 🛒 **Consumo**: Focar nas categorias críticas.\n5. 🚀 **Metas**: O que sobrar para '{top_goal}'.\nSaldo disponível total: MT {cash}.",
    actions: ["Pagar Renda", "Liquidar Xitique", "Amortizar Dívida"]
  },
  simulation: {
    keywords: ['simular', 'simulação', 'calculadora', 'quanto custa', 'prestação', 'juro'],
    message: "Posso ajudar-te a simular créditos, poupanças ou xitiques. O Mwanga tem ferramentas específicas para cálculos rigorosos de juros e prazos. O que queres calcular?",
    actions: ["Simular Crédito", "Simular Poupança", "Simular Xitique"]
  },
  learning: {
    keywords: ['aprende', 'aprendizado', 'inteligência', 'como funciona', 'gerir', 'ajuda-me', 'me ajuda', 'gerir finanças', 'analisa os meus dados', 'dados financeiros'],
    message: "Olá {name}! Eu aprendo diretamente com o teu histórico real de transações, contas, orçamentos, dívidas e metas no Mwanga. Ao analisar o teu ecossistema financeiro atual, detetei:\n\n📊 **Score de Mordomia:** A tua nota geral é **{score}/100**.\n💰 **Caixa Disponível:** Tens **MT {cash}** de saldo líquido nas tuas contas.\n📉 **Pista de Caixa (Runway):** Os teus saldos cobrem **{runway_months} meses** de gastos.\n📈 **Desvios:** {overdue_msg}\n\nCom base nestes padrões reais, a tua prioridade número um hoje é **{priority}** porque *{priority_reason}*.\n\nA minha próxima recomendação de ação para ti é: **{priority_next}**.",
    actions: ["Ver Diagnóstico", "Analisar Gastos", "Rever Orçamentos"]
  }
};

const BINTH_EXPERT_RULES = {
  emergency_liquidity: {
    message: "Olá {name}, o teu caixa disponível (MT {cash}) está num nível crítico para o teu ritmo de despesas. A prioridade número 1 agora é proteger a tua liquidez — fecha os gastos não essenciais até o saldo recuperar. Lembra: gerir bem o pouco que tens hoje é o que vai abrir mais espaço amanhã.",
    biblical_insight: "Fidelidade no Pouco: As pequenas decisões de hoje moldam o grande impacto de amanhã. Cada MT conta.",
    alerta: "⚠️ Saldo crítico — risco de não cobrir despesas essenciais nos próximos dias.",
    actions: ["Verificar contas", "Analisar gastos", "Pôr meta de poupança"]
  },
  severe_overbudget: {
    message: "Atenção {name}! Este mês os teus gastos estão em {pct}% do teu rendimento — estamos em terreno de risco real. Antes de qualquer nova saída, precisa de rever os orçamentos mais pesados e fazer cortes imediatos. Planear é o que separa quem sobrevive do mês de quem o domina.",
    biblical_insight: "Planeamento e Sabedoria: Decisões financeiras intencionais constroem o futuro. O sábio revê o plano antes que o problema aumente.",
    alerta: "⚠️ Despesas acima de 120% do rendimento — risco de dependência de crédito em breve.",
    actions: ["Ver Orçamentos", "Categorias Críticas", "Dicas de Corte"]
  },
  debt_pressure: {
    message: "Olá {name}. O teu rácio de dívida está elevado — MT {debts} no total, o que representa uma pressão real sobre o teu rendimento mensal. Vamos criar um plano de amortização acelerada para sair deste ciclo. A liberdade financeira começa por reduzir aquilo que te prende.",
    biblical_insight: "Evitar Dívidas Excessivas: A dívida é um peso — reduzi-la é reconquistar a tua liberdade financeira, passo a passo.",
    alerta: "⚠️ Risco de dependência de crédito — evita contrair novos empréstimos neste momento.",
    actions: ["Plano de Dívida", "Amortizar Agora", "Ver Simuladores"]
  },
  housing_pending: {
    message: "{name}, tens pendências na habitação que precisam de ser resolvidas com urgência. O tecto sobre a tua cabeça é a base de tudo — protegê-lo é uma responsabilidade de boa gestão. Vamos tratar disso primeiro, antes de qualquer outra conta.",
    biblical_insight: "Mordomia: Somos gestores dos recursos que temos. Garantir o essencial primeiro é honrar essa responsabilidade.",
    alerta: "⚠️ Habitação em atraso — risco de multas ou problemas legais se não regularizado.",
    actions: ["Pagar Renda/Prestação", "Ver Habitação", "Calcular Atrasos"]
  },
  budget_leaks: {
    message: "{name}, a categoria '{cat}' ultrapassou o limite definido este mês. Ainda estamos a tempo de equilibrar — pequenos ajustes noutras áreas nos próximos dias podem fazer toda a diferença. O contentamento é escolher o essencial em vez de ceder a todos os impulsos.",
    biblical_insight: "Contentamento: A riqueza real começa por saber o que é suficiente. Cada limite de orçamento é uma escolha consciente.",
    alerta: null,
    actions: ["Ver Categoria {cat}", "Ajustar Limites", "Resumo do Mês"]
  },
  goal_accelerator: {
    message: "Excelente, {name}! As tuas finanças estão estáveis e o objectivo '{goal}' já vai em {pct}%. Este é o momento certo para dar um empurrão extra e chegar lá mais depressa. Guardar para o amanhã enquanto tens margem hoje — esse é o habito dos que alcançam os seus sonhos.",
    biblical_insight: "Poupança e Proteção: O pé de meia de hoje é a liberdade do futuro. Aproveita a estabilidade para reforçar as tuas metas.",
    alerta: null,
    actions: ["Reforçar {goal}", "Ver Progresso", "Novas Metas"]
  },
  unread_alerts: {
    message: "Olá {name}! Tens notificações importantes por ler que podem mudar a tua estratégia financeira. Quem está informado toma melhores decisões — dá uma olhadela rápida para estarmos alinhados.",
    biblical_insight: "Planeamento e Sabedoria: O sábio mantém-se informado antes de agir. Ignorar alertas é perder oportunidade de corrigir a tempo.",
    alerta: null,
    actions: ["Ler Notificações", "Dashboard", "Ajuda"]
  },
  stability_celebration: {
    message: "Parabéns, {name}! Estás numa fase de excelente equilíbrio financeiro — MT {cash} disponível, despesas controladas, activos a crescer. Este é o momento perfeito para pensar em investimentos ou em como partilhar o teu excedente de forma significativa.",
    biblical_insight: "Generosidade: Quem alcança o equilíbrio tem a oportunidade única de impactar a sua comunidade — Xitique, família, e além.",
    alerta: null,
    actions: ["Simular Investimento", "Ver Património", "Consultar Estratégia"]
  },
  generic_maintenance: {
    message: "Olá {name}, os teus dados mostram uma operação regular e controlada — isso é bom! Para manter esta clareza, garante que todos os movimentos do dia estão registados. Ser fiel no registo do que tens é o primeiro passo para crescer.",
    biblical_insight: "Mordomia: Gerir bem o que temos — registando, acompanhando, decidindo — é a base de qualquer crescimento financeiro.",
    alerta: null,
    actions: ["Registar Transação", "Ver Relatórios", "Falar com Binth"]
  }
};

function getFallbackResponse(userMessage, contextSummary = {}) {
  const name = contextSummary.userName || 'Utilizador';
  const priority = contextSummary.priority || {};
  const msg = (userMessage || '').toLowerCase();
  
  // ─── Direct overrides for highly specific queries ───
  if (msg.includes('juro') || msg.includes('taxa')) {
    const list = Array.isArray(contextSummary.debts) ? contextSummary.debts : [];
    const debtsWithInterest = list.filter(d => Number(d.interest_rate) > 0);
    
    if (debtsWithInterest.length > 0) {
      const topInterest = debtsWithInterest[0];
      return personalizeBinthPayload({
        message: `Sim, ${name}! Tens dívidas registradas com juros ativos no sistema. A dívida com o credor **${topInterest.creditor_name}** tem uma taxa de **${(Number(topInterest.interest_rate) * 100).toFixed(0)}% ao mês** e o saldo devedor restante é de **${Number(topInterest.remaining_amount || 0).toLocaleString('pt-MZ')} MT**. Recomendo priorizar a liquidação destas obrigações para evitar o acúmulo de juros de mora!`,
        insight_type: "warning",
        biblical_insight: "Evitar Dívidas: A dívida com juros severos consome o fruto do teu trabalho. Livra-te dela o quanto antes.",
        quick_actions: ["Plano de Amortização", "Ver Dívidas"],
        data: { intent_matched: true, local_intelligence: true }
      }, contextSummary);
    } else {
      return personalizeBinthPayload({
        message: `Olá ${name}! De momento não tens nenhuma dívida ativa registrada com taxa de juros superior a 0%. Se tens alguma dívida contratada com juros (como a dívida de 30.000 MT com 30% de juros contraída em Março), podes clicar em "Ver Fluxo da Dívida" na aba de Dívidas e usar o simulador para configurar os juros e acompanhar a evolução em tempo real!`,
        insight_type: "info",
        biblical_insight: "Evitar Dívidas: Quem aceita juros pesados torna-se escravo do credor. Planeia para viver livre de obrigações.",
        quick_actions: ["Ver Dívidas", "Simular Crédito"],
        data: { intent_matched: true, local_intelligence: true }
      }, contextSummary);
    }
  }

  if (msg.includes('plano') || msg.includes('amortiza') || msg.includes('cronograma')) {
    return personalizeBinthPayload({
      message: `Podes visualizar o plano de amortização detalhado de qualquer dívida diretamente na aba de **Dívidas** clicando no ícone do gráfico 📊 ao lado da dívida. O Mwanga calcula dinamicamente as prestações pela Tabela Price, discriminando os juros e o capital amortizado mês a mês!`,
      insight_type: "info",
      biblical_insight: "Planeamento e Sabedoria: O sábio calcula os custos antes de assumir um compromisso para não ser envergonhado.",
      quick_actions: ["Ver Dívidas", "Simular Crédito"],
      data: { intent_matched: true, local_intelligence: true }
    }, contextSummary);
  }

  if (msg.includes('simular') || msg.includes('simula') || msg.includes('calculadora')) {
    return personalizeBinthPayload({
      message: `Podes simular novos créditos, poupanças e xitiques diretamente no Mwanga. Se queres simular os juros de uma dívida já existente, podes aceder à aba de Dívidas e clicar em "Ver Fluxo da Dívida" para ajustar as taxas e ver o impacto!`,
      insight_type: "info",
      biblical_insight: "Planeamento e Sabedoria: O prudente vê o perigo de longe e desvia-se; o ingénuo avança e sofre as consequências.",
      quick_actions: ["Simular Crédito", "Simular Poupança", "Ver Dívidas"],
      data: { intent_matched: true, local_intelligence: true }
    }, contextSummary);
  }

  // 1. Intent Detection
  let selectedRule = null;
  let intentMatched = false;

  for (const [intentId, rule] of Object.entries(BINTH_INTENT_RULES)) {
    if (rule.keywords.some(k => msg.includes(k))) {
      selectedRule = rule;
      intentMatched = true;
      break;
    }
  }

  // 2. Fallback to Priority if no intent matched
  if (!selectedRule) {
    selectedRule = BINTH_EXPERT_RULES[priority.id] || BINTH_EXPERT_RULES.generic_maintenance;
  }

  // 3. Dynamic Message Construction
  const income = Number(contextSummary.monthlyIncome || 0);
  const expenses = Number(contextSummary.monthlyExpenses || 0);
  const debts = Number(contextSummary.debtTotal || 0);
  const cashAvailable = Number(contextSummary.cashAvailable || 0);
  const topGoal = contextSummary.topGoalName || 'Pé de Meia';
  const topGoalPct = contextSummary.topGoalPct || 0;
  const overdueBudgetCount = Number(contextSummary.overdueBudgetCount || 0);
  const goalCount = Number(contextSummary.goalCount || 0);

  // Calculate local Stewardship Score
  const savingsRate = income > 0 ? (income - expenses) / income : 0;
  const savingsPts = Math.min(25, Math.max(0, Math.round(savingsRate * 125)));
  const budgetPts = Math.max(0, 25 - overdueBudgetCount * 8);
  const goalPts = Math.min(20, goalCount * 5);
  const debtPts = debts > income * 3 ? 0 : Math.max(0, Math.round(20 - (debts / (income * 12 || 1)) * 6));
  const localScore = Math.min(100, Math.max(0, savingsPts + budgetPts + goalPts + debtPts + 10)); // base offset

  // Calculate Runway
  const runwayMonths = expenses > 0 ? Math.max(0, Math.floor(cashAvailable / expenses)) : 6;
  
  // Calculate specific sub-messages
  const overdueMsg = overdueBudgetCount > 0 
    ? `Tens ${overdueBudgetCount} categorias acima do limite (ex: ${contextSummary.topOverBudgetCategory}). `
    : 'Os teus orçamentos estão sob controlo. ';
  
  const debtPriorityMsg = debts > income * 3
    ? 'O nível de endividamento é preocupante.'
    : 'A tua dívida está dentro de um patamar gerível.';

  let finalMessage = selectedRule.message
    .replace(/{name}/g, name)
    .replace(/{cash}/g, cashAvailable.toLocaleString('pt-MZ'))
    .replace(/{income}/g, income.toLocaleString('pt-MZ'))
    .replace(/{expenses}/g, expenses.toLocaleString('pt-MZ'))
    .replace(/{net_month}/g, (income - expenses).toLocaleString('pt-MZ'))
    .replace(/{debts}/g, debts.toLocaleString('pt-MZ'))
    .replace(/{pct}/g, income > 0 ? Math.round((expenses / income) * 100) : '---')
    .replace(/{goal}/g, topGoal)
    .replace(/{top_goal}/g, topGoal)
    .replace(/{top_goal_pct}/g, topGoalPct)
    .replace(/{goal_count}/g, goalCount)
    .replace(/{cat}/g, contextSummary.topOverBudgetCategory || 'Geral')
    .replace(/{rent_total}/g, (contextSummary.rentTotal || 0).toLocaleString('pt-MZ'))
    .replace(/{xitique_total}/g, (contextSummary.xitiqueTotal || 0).toLocaleString('pt-MZ'))
    .replace(/{debt_monthly}/g, (contextSummary.debtMonthlyTotal || 0).toLocaleString('pt-MZ'))
    .replace(/{extra_msg}/g, overdueMsg)
    .replace(/{overdue_msg}/g, overdueMsg)
    .replace(/{debt_priority_msg}/g, debtPriorityMsg)
    .replace(/{debt_msg}/g, debtPriorityMsg)
    .replace(/{score}/g, localScore)
    .replace(/{runway_months}/g, runwayMonths)
    .replace(/{priority}/g, priority.priority || 'manter o registo disciplinado')
    .replace(/{priority_reason}/g, priority.reason || 'os teus dados mostram uma operação regular sob controlo')
    .replace(/{priority_next}/g, priority.nextAction || 'garantir que todas as pequenas transações do dia estão no Mwanga');

  const biblicalPrinciple = priority.biblical_principle || null;

  return {
    message: finalMessage.trim(),
    insight_type: intentMatched ? "action" : (priority.insight_type || "info"),
    biblical_insight: selectedRule.biblical_insight
      || (biblicalPrinciple ? `${biblicalPrinciple.name}: ${biblicalPrinciple.insight}` : null),
    alerta: selectedRule.alerta || null,
    quick_actions: (selectedRule.actions || []).map(a => 
      a.replace(/{goal}/g, topGoal)
       .replace(/{top_goal}/g, topGoal)
       .replace(/{cat}/g, contextSummary.topOverBudgetCategory || 'Gastos')
    ),
    data: {
      priority: priority.priority,
      reason: priority.reason,
      biblical_principle: biblicalPrinciple?.name || null,
      intent_matched: intentMatched,
      local_intelligence: true
    }
  };
}

// ─── Main Caller with Fallback ─────────────────────────────────────────────────
async function callBinth({ messages, apiKey, provider = 'gemini', householdId, userId }) {
  const userContext = await buildUserContext(householdId, userId);
  const userMessage = messages[messages.length - 1]?.content || '';



  const system = BINTH_SYSTEM_PROMPT.replace('{user_context}', userContext.text);
  
  let order = [provider, ...Object.keys(PROVIDERS).filter(p => p !== provider)];
  const isLocal = process.env.NODE_ENV !== 'production' || process.env.OLLAMA_ENABLED === 'true';
  if (isLocal) {
    order = ['ollama', ...order.filter(p => p !== 'ollama')];
  } else {
    order = order.filter(p => p !== 'ollama');
  }

  for (const p of order) {
    if (!apiKey && p !== 'ollama' && await isProviderTemporarilyDisabled(p)) continue;

    let activeKey = apiKey;
    if (!activeKey && p !== 'ollama') {
      if (p === 'openrouter')      activeKey = process.env.OPENROUTER_API_KEY;
      if (p === 'openrouter_free') activeKey = process.env.OPENROUTER_API_KEY; // mesmo token, modelo diferente
      if (p === 'gemini')          activeKey = process.env.GEMINI_API_KEY;
      if (p === 'groq')            activeKey = process.env.GROQ_API_KEY;
    }

    if (!activeKey && p !== 'ollama') continue;

    const config = PROVIDERS[p];
    try {
      const hdrs = config.headers(activeKey);
      const tools = ToolRegistry.getToolsSchema();
      const activeSystem = p === 'ollama'
        ? OLLAMA_SYSTEM_PROMPT.replace('{user_context}', userContext.textMinimized)
        : system;
      const payload = config.body(messages, activeSystem, tools);
      
      const timeoutMs = p === 'ollama' ? 120000 : 30000;
      const res = await fetch(config.url(activeKey), {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 100)}`);
      }

      const data = await res.json();
      const raw = config.extract(data) || '';
      
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
          body: JSON.stringify(config.body(nextMessages, activeSystem)),
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
        await disableProviderTemporarily(p);
        logger.warn({ provider: p }, 'Binth provider temporarily disabled after auth failure');
        continue;
      }
      logger.warn({ provider: p, error: err.message }, 'Binth provider call failed');
    }
  }

  logger.warn('All Binth providers failed. Using fallback response.');
  return getFallbackResponse(messages[messages.length - 1]?.content || '', userContext.summary);
}

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

  if (!payload || typeof payload !== 'object') return payload;

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

module.exports = { callBinth, buildUserContext, getFallbackResponse };
