const crypto = require('crypto');
const { db } = require('../config/db');
const logger = require('../utils/logger');

// One row per Binth answer: who asked (ids only), which provider and model
// answered, which tool ran, tokens, estimated cost, latency and, for proposals,
// whether the person confirmed or cancelled. Never the text of the
// conversation: the row is for cost, quality and incident reconstruction.
//
// Rows are kept for RETENTION_DAYS and then deleted.
const RETENTION_DAYS = Number(process.env.AI_CALLS_RETENTION_DAYS || 180);

// Estimated price in USD per million tokens [input, output]. Override or add
// models with AI_PRICES_JSON, e.g. {"gemini-2.5-flash":[0.3,2.5]}.
const DEFAULT_PRICES = {
  'gemini-2.5-flash': [0.30, 2.50],
  'gemini-2.5-flash-lite': [0.10, 0.40],
  'gemini-2.0-flash': [0.10, 0.40],
  'gemini-2.0-flash-lite': [0.075, 0.30],
  'llama-3.1-8b-instant': [0.05, 0.08],
  'llama-3.3-70b-versatile': [0.59, 0.79],
  'google/gemini-2.5-flash': [0.30, 2.50],
  'google/gemini-2.0-flash-001': [0.10, 0.40],
};

function prices() {
  try {
    const extra = JSON.parse(process.env.AI_PRICES_JSON || '{}');
    return { ...DEFAULT_PRICES, ...extra };
  } catch {
    return DEFAULT_PRICES;
  }
}

function isFreeModel(provider, model) {
  return provider === 'ollama' || provider === 'local' || /:free$/.test(model || '') || model === 'openrouter/free';
}

// null when the model's price is unknown (the admin view shows "unknown"
// instead of pretending it cost nothing).
function estimateCostUsd(provider, model, inputTokens, outputTokens) {
  if (isFreeModel(provider, model)) return 0;
  const name = String(model || '').replace(/^models\//, '');
  const price = prices()[name] || prices()[name.replace(/-\d{3,}$/, '')];
  if (!price) return null;
  return (inputTokens * price[0] + outputTokens * price[1]) / 1e6;
}

// Tokens and the model that really answered, from each provider's response.
function readUsage(provider, data) {
  if (!data || typeof data !== 'object') return { inputTokens: 0, outputTokens: 0 };
  if (provider === 'gemini') {
    const u = data.usageMetadata || {};
    return {
      inputTokens: Number(u.promptTokenCount) || 0,
      outputTokens: (Number(u.candidatesTokenCount) || 0) + (Number(u.thoughtsTokenCount) || 0),
      model: data.modelVersion,
    };
  }
  if (provider === 'ollama') {
    return { inputTokens: Number(data.prompt_eval_count) || 0, outputTokens: Number(data.eval_count) || 0, model: data.model };
  }
  const u = data.usage || {};
  return {
    inputTokens: Number(u.prompt_tokens) || 0,
    outputTokens: Number(u.completion_tokens) || 0,
    model: data.model,
    // OpenRouter reports the real charge in USD credits.
    providerCostUsd: Number.isFinite(Number(u.cost)) ? Number(u.cost) : undefined,
  };
}

function createTrace(feature = 'chat') {
  return {
    id: crypto.randomUUID(),
    feature,
    provider: null,
    model: null,
    keyOwner: null,
    tool: null,
    proposalAction: null,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    costKnown: true,
    providerCalls: 0,
    attempts: 0,
    errors: [],
    startedAt: Date.now(),
  };
}

// Adds one provider response to the trace. Called for every successful HTTP
// call, including the second call after a tool.
function addUsage(trace, provider, data, configuredModel) {
  if (!trace) return;
  const usage = readUsage(provider, data);
  const model = usage.model || configuredModel || null;
  trace.providerCalls += 1;
  trace.inputTokens += usage.inputTokens;
  trace.outputTokens += usage.outputTokens;
  trace.model = model;
  const cost = usage.providerCostUsd !== undefined
    ? usage.providerCostUsd
    : estimateCostUsd(provider, model, usage.inputTokens, usage.outputTokens);
  if (cost === null) trace.costKnown = false;
  else trace.costUsd += cost;
}

async function initAiTelemetrySchema() {
  try {
    await db.execute({
      sql: `CREATE TABLE IF NOT EXISTS ai_calls (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_id INTEGER,
        household_id INTEGER,
        feature TEXT NOT NULL,
        provider TEXT,
        model TEXT,
        key_owner TEXT,
        outcome TEXT NOT NULL,
        error_kinds TEXT,
        tool TEXT,
        proposal_action TEXT,
        proposal_outcome TEXT,
        proposal_resolved_at TIMESTAMPTZ,
        latency_ms INTEGER,
        attempts INTEGER,
        provider_calls INTEGER,
        input_tokens INTEGER,
        output_tokens INTEGER,
        cost_usd NUMERIC(12, 6),
        release TEXT
      )`,
      args: [],
    });
    await db.execute({ sql: 'CREATE INDEX IF NOT EXISTS ai_calls_created_idx ON ai_calls (created_at)', args: [] });
    await db.execute({ sql: 'CREATE INDEX IF NOT EXISTS ai_calls_user_idx ON ai_calls (user_id, created_at)', args: [] });
    await db.execute({ sql: 'ALTER TABLE ai_calls ENABLE ROW LEVEL SECURITY', args: [] });
    await db.execute({ sql: `DELETE FROM ai_calls WHERE created_at < NOW() - INTERVAL '${Math.max(7, Math.floor(RETENTION_DAYS))} days'`, args: [] });
  } catch (error) {
    logger.warn(`Failed to initialize ai_calls table: ${error.message}`);
  }
}

// outcome: 'ok' (a provider answered), 'fallback' (local rules answered).
// Never throws and never delays the answer.
function recordAiCall(trace, { userId, householdId, outcome }) {
  if (!trace) return;
  const row = [
    trace.id, userId ?? null, householdId ?? null, trace.feature, trace.provider, trace.model,
    trace.keyOwner, outcome, trace.errors.length ? trace.errors.join(',').slice(0, 200) : null,
    trace.tool, trace.proposalAction, Date.now() - trace.startedAt, trace.attempts, trace.providerCalls,
    trace.inputTokens, trace.outputTokens, trace.costKnown ? Number(trace.costUsd.toFixed(6)) : null,
    logger.release || null,
  ];
  logger.info({
    aiCall: trace.id, feature: trace.feature, provider: trace.provider, model: trace.model, keyOwner: trace.keyOwner,
    outcome, tool: trace.tool, proposal: trace.proposalAction, latencyMs: row[11], tokensIn: trace.inputTokens,
    tokensOut: trace.outputTokens, costUsd: row[16], errors: row[8],
  }, 'Binth AI call');
  Promise.resolve()
    .then(() => db.execute({
      sql: `INSERT INTO ai_calls (id, user_id, household_id, feature, provider, model, key_owner, outcome,
              error_kinds, tool, proposal_action, latency_ms, attempts, provider_calls, input_tokens,
              output_tokens, cost_usd, release)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: row,
    }))
    .catch(err => logger.warn({ err: err.message }, 'Could not record AI call'));
}

const PROPOSAL_OUTCOMES = ['confirmed', 'cancelled', 'failed'];

// The person tapped Confirmar or Cancelar on a Binth proposal. Only the owner of
// the call can set it, and only once.
async function recordProposalOutcome({ callId, userId, outcome }) {
  if (!PROPOSAL_OUTCOMES.includes(outcome)) return false;
  const res = await db.execute({
    sql: `UPDATE ai_calls SET proposal_outcome = ?, proposal_resolved_at = NOW()
          WHERE id = ? AND user_id = ? AND proposal_action IS NOT NULL AND proposal_outcome IS NULL
          RETURNING id`,
    args: [outcome, callId, userId],
  });
  return (res.rows || []).length > 0;
}

// Estimated spend on Mwanga's own keys since the start of this month (UTC).
async function monthSpendUsd() {
  const res = await db.execute({
    sql: `SELECT COALESCE(SUM(cost_usd), 0) AS total FROM ai_calls
          WHERE key_owner = 'mwanga' AND created_at >= date_trunc('month', NOW())`,
    args: [],
  });
  return Number(res.rows?.[0]?.total || 0);
}

// Daily figures for the admin view. "Cost per completed task" divides the spend
// by the answers that ended in an answer or a confirmed proposal, so a cheap
// model that needs retries or gets cancelled shows up as expensive.
async function metrics(days = 30) {
  const span = Math.min(Math.max(Number(days) || 30, 1), 180);
  const res = await db.execute({
    sql: `SELECT
            to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
            COUNT(*) AS calls,
            COUNT(*) FILTER (WHERE outcome = 'fallback') AS fallbacks,
            COUNT(*) FILTER (WHERE proposal_action IS NOT NULL) AS proposals,
            COUNT(*) FILTER (WHERE proposal_outcome = 'confirmed') AS confirmed,
            COUNT(*) FILTER (WHERE proposal_outcome = 'cancelled') AS cancelled,
            COUNT(*) FILTER (WHERE outcome = 'ok' AND (proposal_action IS NULL OR proposal_outcome = 'confirmed')) AS completed,
            ROUND(AVG(latency_ms)) AS avg_latency_ms,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency_ms,
            COALESCE(SUM(input_tokens), 0) AS input_tokens,
            COALESCE(SUM(output_tokens), 0) AS output_tokens,
            COALESCE(SUM(cost_usd) FILTER (WHERE key_owner = 'mwanga'), 0) AS mwanga_cost_usd,
            COUNT(DISTINCT user_id) AS active_users
          FROM ai_calls
          WHERE created_at >= NOW() - (? || ' days')::interval
          GROUP BY 1 ORDER BY 1 DESC`,
    args: [String(span)],
  });
  const byModel = await db.execute({
    sql: `SELECT provider, model, key_owner, COUNT(*) AS calls,
            COUNT(*) FILTER (WHERE outcome = 'ok') AS answered,
            ROUND(AVG(latency_ms)) AS avg_latency_ms,
            COALESCE(SUM(cost_usd), 0) AS cost_usd
          FROM ai_calls
          WHERE created_at >= NOW() - (? || ' days')::interval
          GROUP BY 1, 2, 3 ORDER BY calls DESC LIMIT 20`,
    args: [String(span)],
  });
  const days_ = (res.rows || []).map(r => {
    const completed = Number(r.completed || 0);
    const cost = Number(r.mwanga_cost_usd || 0);
    const users = Number(r.active_users || 0);
    return {
      day: r.day,
      calls: Number(r.calls || 0),
      fallbacks: Number(r.fallbacks || 0),
      proposals: Number(r.proposals || 0),
      confirmed: Number(r.confirmed || 0),
      cancelled: Number(r.cancelled || 0),
      completed,
      avgLatencyMs: Number(r.avg_latency_ms || 0),
      p95LatencyMs: Math.round(Number(r.p95_latency_ms || 0)),
      inputTokens: Number(r.input_tokens || 0),
      outputTokens: Number(r.output_tokens || 0),
      mwangaCostUsd: cost,
      activeUsers: users,
      costPerCompletedTaskUsd: completed > 0 ? cost / completed : null,
      costPerActiveUserUsd: users > 0 ? cost / users : null,
    };
  });
  return {
    days: days_,
    byModel: (byModel.rows || []).map(r => ({
      provider: r.provider, model: r.model, keyOwner: r.key_owner, calls: Number(r.calls || 0),
      answered: Number(r.answered || 0), avgLatencyMs: Number(r.avg_latency_ms || 0), costUsd: Number(r.cost_usd || 0),
    })),
    monthSpendUsd: await monthSpendUsd(),
  };
}

module.exports = {
  createTrace, addUsage, readUsage, estimateCostUsd, recordAiCall, recordProposalOutcome,
  monthSpendUsd, metrics, initAiTelemetrySchema, PROPOSAL_OUTCOMES,
};
