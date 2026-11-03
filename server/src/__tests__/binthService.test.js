jest.mock('../config/db', () => ({ db: { execute: jest.fn().mockResolvedValue({ rows: [] }) } }));
jest.mock('../services/notificationRead.service', () => ({ getNotificationReadValue: jest.fn().mockResolvedValue(false) }));
jest.mock('../config/redis', () => ({ redis: null }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), debug: jest.fn() }));
jest.mock('../services/toolRegistry', () => ({ getToolsSchema: jest.fn().mockReturnValue([]), executeTool: jest.fn().mockResolvedValue({ data: { balance: 100 } }) }));
const { callBinth } = require('../services/binthService');
const tools = require('../services/toolRegistry');
const response = parts => ({ ok: true, json: async () => ({ candidates: [{ content: { parts } }] }) });
beforeEach(() => { jest.clearAllMocks(); global.fetch = jest.fn(); });
afterEach(() => { delete global.fetch; });
test('keeps tool calls in the authenticated household despite model arguments', async () => {
  fetch.mockResolvedValueOnce(response([{ functionCall: { name: 'calculateLiquidityRisk', args: { householdId: 999 } } }]))
    .mockResolvedValueOnce(response([{ text: '{"message":"Hello!","quick_actions":[]}' }]));
  await callBinth({ messages: [{ role: 'user', content: 'Review spending' }], householdId: 7, userId: 3, apiKey: 'test-key', provider: 'gemini', language: 'en' });
  expect(tools.executeTool).toHaveBeenCalledWith('calculateLiquidityRisk', { householdId: 7 });
  const payload = JSON.parse(fetch.mock.calls[0][1].body);
  expect(payload.system_instruction.parts[0].text).toContain('OUTPUT LANGUAGE: English');
});
const keyOf = call => JSON.stringify(call[1].headers);
const ownerEnv = ['NODE_ENV', 'GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY', 'AI_CREDENTIALS_ENCRYPTION_KEY'];
let savedEnv;
beforeEach(() => { savedEnv = Object.fromEntries(ownerEnv.map(k => [k, process.env[k]])); });
afterEach(() => { for (const k of ownerEnv) { if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k]; } });
function savePersonal(provider, key = 'personal-secret-key') {
  const { db } = require('../config/db');
  const settings = require('../services/aiSettings.service');
  process.env.AI_CREDENTIALS_ENCRYPTION_KEY = 'ab'.repeat(32);
  db.execute.mockResolvedValueOnce({ rows: [{ value: JSON.stringify(settings.encrypt(key, 7, 3, provider)) }] });
}
const failing = (status, text) => ({ ok: false, status, text: async () => text });
const groqOk = text => ({ ok: true, json: async () => ({ choices: [{ message: { content: text } }] }) });

test('never forwards a personal key to another provider on failure', async () => {
  fetch.mockRejectedValue(new Error('Unavailable'));
  const result = await callBinth({ messages: [{ role: 'user', content: 'Review spending' }], householdId: 7, userId: 3, apiKey: 'test-key', provider: 'gemini', language: 'en' });
  const withKey = fetch.mock.calls.filter(call => keyOf(call).includes('test-key'));
  expect(withKey).toHaveLength(1);
  expect(withKey[0][0]).toContain('generativelanguage.googleapis.com');
  expect(result.data.local_intelligence).toBe(true);
  expect(result.message).toContain('Record income');
});
test('automatically uses the saved personal provider and never forwards it elsewhere', async () => {
  savePersonal('groq');
  fetch.mockRejectedValue(new Error('Unavailable'));
  await callBinth({ messages: [{ role: 'user', content: 'Review spending' }], householdId: 7, userId: 3, language: 'en' });
  expect(fetch.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer personal-secret-key');
  const leaked = fetch.mock.calls.slice(1).filter(call => keyOf(call).includes('personal-secret-key'));
  expect(leaked).toHaveLength(0);
});
test('falls back to Mwanga keys when the personal key runs out of credits, and says so', async () => {
  process.env.NODE_ENV = 'production'; process.env.GROQ_API_KEY = 'owner-groq';
  delete process.env.GEMINI_API_KEY; delete process.env.OPENROUTER_API_KEY;
  savePersonal('gemini');
  fetch.mockResolvedValueOnce(failing(429, '{"error":{"status":"RESOURCE_EXHAUSTED","message":"quota exceeded"}}'))
    .mockResolvedValueOnce(groqOk('{"message":"Resposta da Binth","quick_actions":[]}'));
  const result = await callBinth({ messages: [{ role: 'user', content: 'Oi' }], householdId: 7, userId: 3 });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer owner-groq');
  expect(result.message).toBe('Resposta da Binth');
  expect(result.data.ai_notice).toBe('personal_no_credits');
});
test('an OpenRouter personal key without credits retries the free model with the same key', async () => {
  process.env.NODE_ENV = 'production';
  delete process.env.GEMINI_API_KEY; delete process.env.GROQ_API_KEY; delete process.env.OPENROUTER_API_KEY;
  savePersonal('openrouter');
  fetch.mockResolvedValueOnce(failing(402, '{"error":{"message":"Insufficient credits"}}'))
    .mockResolvedValueOnce(groqOk('{"message":"Free!","quick_actions":[]}'));
  const result = await callBinth({ messages: [{ role: 'user', content: 'Oi' }], householdId: 7, userId: 3 });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(JSON.parse(fetch.mock.calls[1][1].body).model).toMatch(/:free$/);
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer personal-secret-key');
  expect(result.message).toBe('Free!');
  expect(result.data.ai_notice).toBeUndefined();
});
test('reports service_no_credits when Mwanga keys are out of credits and no personal key exists', async () => {
  process.env.NODE_ENV = 'production'; process.env.OPENROUTER_API_KEY = 'owner-or';
  delete process.env.GEMINI_API_KEY; delete process.env.GROQ_API_KEY;
  fetch.mockResolvedValue(failing(402, 'Insufficient credits'));
  const result = await callBinth({ messages: [{ role: 'user', content: 'Oi' }], householdId: 7, userId: 3 });
  expect(result.data.ai_status).toEqual({ state: 'offline', reason: 'service_no_credits', has_personal_key: false });
});
test('classifies provider errors', () => {
  const { classifyProviderError } = require('../services/binthService');
  expect(classifyProviderError(402, '')).toBe('no_credits');
  expect(classifyProviderError(429, 'RESOURCE_EXHAUSTED')).toBe('no_credits');
  expect(classifyProviderError(401, '')).toBe('rejected');
  expect(classifyProviderError(429, 'slow down')).toBe('rate_limited');
  expect(classifyProviderError(500, 'boom')).toBe('unavailable');
});
test('sends the tool result back inside the user turn and returns the final answer', async () => {
  fetch.mockResolvedValueOnce(response([{ functionCall: { name: 'calculateLiquidityRisk', args: {} } }]))
    .mockResolvedValueOnce(response([{ text: '{"message":"Tens 2 meses de folga.","quick_actions":[]}' }]));
  const result = await callBinth({ messages: [{ role: 'user', content: 'Estou bem?' }], householdId: 7, userId: 3, apiKey: 'test-key', provider: 'gemini' });
  const second = JSON.parse(fetch.mock.calls[1][1].body);
  const last = second.contents[second.contents.length - 1];
  expect(last.role).toBe('user');
  expect(last.parts[0].text).toContain('Estou bem?');
  expect(last.parts[0].text).toContain('"balance":100');
  expect(second.contents.some(c => c.role === 'model' && !c.parts[0].text)).toBe(false);
  expect(result.message).toBe('Tens 2 meses de folga.');
});
test('an empty AI answer moves on instead of showing a placeholder', async () => {
  fetch.mockResolvedValueOnce(response([{ text: '' }]));
  fetch.mockRejectedValue(new Error('Unavailable'));
  const result = await callBinth({ messages: [{ role: 'user', content: 'Oi' }], householdId: 7, userId: 3, apiKey: 'test-key', provider: 'gemini' });
  expect(result.message).not.toContain('Estou a processar');
  expect(result.data.local_intelligence).toBe(true);
});
