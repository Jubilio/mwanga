jest.mock('../config/db', () => ({ db: { execute: jest.fn().mockResolvedValue({ rows: [] }) } }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const { db } = require('../config/db');
const t = require('../services/aiTelemetry');

const flush = () => new Promise(r => setImmediate(r));
beforeEach(() => { db.execute.mockReset(); db.execute.mockResolvedValue({ rows: [] }); delete process.env.AI_PRICES_JSON; });

describe('usage and cost', () => {
  test('reads Gemini usage metadata', () => {
    expect(t.readUsage('gemini', { usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 300 }, modelVersion: 'gemini-2.5-flash' }))
      .toEqual({ inputTokens: 1200, outputTokens: 300, model: 'gemini-2.5-flash' });
  });

  test('reads OpenAI-style usage and the OpenRouter charge', () => {
    expect(t.readUsage('openrouter', { model: 'google/gemini-2.5-flash', usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0.0012 } }))
      .toEqual({ inputTokens: 10, outputTokens: 5, model: 'google/gemini-2.5-flash', providerCostUsd: 0.0012 });
  });

  test('estimates cost from the price table, free models cost nothing, unknown models are null', () => {
    expect(t.estimateCostUsd('gemini', 'gemini-2.5-flash', 1e6, 1e6)).toBeCloseTo(2.8);
    expect(t.estimateCostUsd('openrouter_free', 'openrouter/free', 5000, 5000)).toBe(0);
    expect(t.estimateCostUsd('groq', 'some-new-model', 10, 10)).toBeNull();
    process.env.AI_PRICES_JSON = '{"some-new-model":[1,1]}';
    expect(t.estimateCostUsd('groq', 'some-new-model', 1e6, 0)).toBe(1);
  });

  test('a trace adds up every provider call (tool call and the answer after it)', () => {
    const trace = t.createTrace('chat');
    t.addUsage(trace, 'gemini', { usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 50 } }, 'gemini-2.5-flash');
    t.addUsage(trace, 'gemini', { usageMetadata: { promptTokenCount: 1100, candidatesTokenCount: 200 } }, 'gemini-2.5-flash');
    expect(trace).toMatchObject({ providerCalls: 2, inputTokens: 2100, outputTokens: 250, model: 'gemini-2.5-flash', costKnown: true });
    expect(trace.costUsd).toBeCloseTo((2100 * 0.3 + 250 * 2.5) / 1e6);
  });
});

describe('recording', () => {
  test('stores ids, provider, tokens and cost, never the conversation text', async () => {
    const trace = t.createTrace('chat');
    trace.provider = 'gemini'; trace.keyOwner = 'mwanga'; trace.tool = 'proposeTransaction'; trace.proposalAction = 'add_transaction';
    t.addUsage(trace, 'gemini', { usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10 } }, 'gemini-2.5-flash');
    t.recordAiCall(trace, { userId: 3, householdId: 7, outcome: 'ok' });
    await flush();
    const [call] = db.execute.mock.calls;
    expect(call[0].sql).toMatch(/INSERT INTO ai_calls/);
    const args = call[0].args;
    expect(args).toEqual(expect.arrayContaining([trace.id, 3, 7, 'chat', 'gemini', 'gemini-2.5-flash', 'mwanga', 'ok', 'proposeTransaction', 'add_transaction', 100, 10]));
    expect(args.join(' ')).not.toMatch(/gastei|chapa/);
  });

  test('a failing insert never throws', async () => {
    db.execute.mockRejectedValue(new Error('db down'));
    expect(() => t.recordAiCall(t.createTrace(), { userId: 1, householdId: 1, outcome: 'ok' })).not.toThrow();
    await flush();
  });

  test('proposal outcome is scoped to the owner of the call', async () => {
    db.execute.mockResolvedValueOnce({ rows: [{ id: 'x' }] });
    await expect(t.recordProposalOutcome({ callId: 'x', userId: 3, outcome: 'confirmed' })).resolves.toBe(true);
    expect(db.execute.mock.calls[0][0].sql).toMatch(/WHERE id = \? AND user_id = \?/);
    expect(db.execute.mock.calls[0][0].args).toEqual(['confirmed', 'x', 3]);
    await expect(t.recordProposalOutcome({ callId: 'x', userId: 3, outcome: 'whatever' })).resolves.toBe(false);
  });

  test('metrics compute cost per completed task and per active user', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [{ day: '2026-11-06', calls: '10', fallbacks: '1', proposals: '4', confirmed: '3', cancelled: '1', completed: '8', avg_latency_ms: '1800', p95_latency_ms: 4200.4, input_tokens: '20000', output_tokens: '3000', mwanga_cost_usd: '0.04', active_users: '4' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '0.5' }] });
    const m = await t.metrics(7);
    expect(m.days[0]).toMatchObject({ calls: 10, completed: 8, p95LatencyMs: 4200, costPerCompletedTaskUsd: 0.005, costPerActiveUserUsd: 0.01 });
    expect(m.monthSpendUsd).toBe(0.5);
  });
});
