jest.mock('../config/db', () => ({ db: { execute: jest.fn().mockResolvedValue({ rows: [] }) } }));
jest.mock('../services/notificationRead.service', () => ({ getNotificationReadValue: jest.fn().mockResolvedValue(false) }));
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
test('never forwards a personal key to another provider on failure', async () => {
  fetch.mockRejectedValue(new Error('Unavailable'));
  const result = await callBinth({ messages: [{ role: 'user', content: 'Review spending' }], householdId: 7, userId: 3, apiKey: 'test-key', provider: 'gemini', language: 'en' });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(result.data.local_intelligence).toBe(true);
  expect(result.message).toContain('Record income');
});
test('automatically uses the saved personal provider and never forwards it elsewhere', async () => {
  const { db } = require('../config/db');
  const settings = require('../services/aiSettings.service');
  process.env.AI_CREDENTIALS_ENCRYPTION_KEY = 'ab'.repeat(32);
  const record = settings.encrypt('personal-secret-key', 7, 3, 'groq');
  db.execute.mockResolvedValueOnce({ rows: [{ value: JSON.stringify(record) }] });
  fetch.mockRejectedValue(new Error('Unavailable'));
  await callBinth({ messages: [{ role: 'user', content: 'Review spending' }], householdId: 7, userId: 3, language: 'en' });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer personal-secret-key');
  delete process.env.AI_CREDENTIALS_ENCRYPTION_KEY;
});
