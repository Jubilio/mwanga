jest.mock('../config/db', () => ({ db: { execute: jest.fn().mockResolvedValue({ rows: [] }) } }));
jest.mock('../services/notificationRead.service', () => ({ getNotificationReadValue: jest.fn().mockResolvedValue(false) }));
jest.mock('../config/redis', () => ({ redis: null }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('../services/aiBudget', () => ({ isOverBudget: jest.fn().mockResolvedValue(false) }));
const { db } = require('../config/db');
const { isOverBudget } = require('../services/aiBudget');
const { callBinth } = require('../services/binthService');

const flush = () => new Promise(r => setImmediate(r));
const inserts = () => db.execute.mock.calls.filter(([q]) => /INSERT INTO ai_calls/.test(q.sql)).map(([q]) => q.args);
const env = ['NODE_ENV', 'GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'BINTH_FREE_DAILY_LIMIT'];
let saved;
beforeEach(() => {
  saved = Object.fromEntries(env.map(k => [k, process.env[k]]));
  process.env.NODE_ENV = 'production';
  process.env.GEMINI_API_KEY = 'owner-gemini';
  delete process.env.GROQ_API_KEY; delete process.env.OPENROUTER_API_KEY;
  jest.clearAllMocks();
  db.execute.mockResolvedValue({ rows: [] });
  isOverBudget.mockResolvedValue(false);
  global.fetch = jest.fn();
});
afterEach(() => {
  for (const k of env) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  delete global.fetch;
});

test('every answer has a call_id and the call is recorded with tokens and model', async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({
    candidates: [{ content: { parts: [{ text: '{"message":"Olá","quick_actions":[]}' }] } }],
    usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 40 },
    modelVersion: 'gemini-2.5-flash',
  }) });
  const res = await callBinth({ messages: [{ role: 'user', content: 'Como estou?' }], householdId: 7, userId: 3 });
  await flush();
  expect(res.call_id).toMatch(/^[0-9a-f-]{36}$/);
  const [row] = inserts();
  expect(row[0]).toBe(res.call_id);
  expect(row).toEqual(expect.arrayContaining([3, 7, 'chat', 'gemini', 'gemini-2.5-flash', 'mwanga', 'ok', 900, 40]));
});

test('a proposal is recorded with its action so Confirmar/Cancelar can be reported', async () => {
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({
    candidates: [{ content: { parts: [{ functionCall: { name: 'proposeTransaction', args: { type: 'despesa', amount: 500, description: 'Chapa' } } }] } }],
  }) });
  const res = await callBinth({ messages: [{ role: 'user', content: 'gastei 500 no chapa ontem à noite' }], householdId: 7, userId: 3 });
  await flush();
  expect(res.pending_action.action).toBe('add_transaction');
  const [row] = inserts();
  expect(row).toEqual(expect.arrayContaining(['proposeTransaction', 'add_transaction']));
});

test('over the monthly budget, Mwanga keys are not called and the local answer is recorded', async () => {
  isOverBudget.mockResolvedValue(true);
  const res = await callBinth({ messages: [{ role: 'user', content: 'Como estou?' }], householdId: 7, userId: 3 });
  await flush();
  expect(fetch).not.toHaveBeenCalled();
  expect(res.data.local_intelligence).toBe(true);
  const [row] = inserts();
  expect(row).toEqual(expect.arrayContaining(['local', 'fallback', 'budget']));
});

test('a personal key is still used when Mwanga is over budget', async () => {
  isOverBudget.mockResolvedValue(true);
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: '{"message":"Ok","quick_actions":[]}' } }], usage: { prompt_tokens: 10, completion_tokens: 2 }, model: 'llama-3.1-8b-instant' }) });
  const res = await callBinth({ messages: [{ role: 'user', content: 'Oi' }], householdId: 7, userId: 3, apiKey: 'mine', provider: 'groq' });
  await flush();
  expect(res.message).toBe('Ok');
  expect(inserts()[0]).toEqual(expect.arrayContaining(['groq', 'personal', 'ok']));
});
