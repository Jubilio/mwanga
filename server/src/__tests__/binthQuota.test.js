jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../services/notificationRead.service', () => ({ getNotificationReadValue: jest.fn().mockResolvedValue(false) }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() }));
jest.mock('../services/toolRegistry', () => ({ getToolsSchema: jest.fn().mockReturnValue([]), executeTool: jest.fn() }));
const { db } = require('../config/db');
const { checkDailyAiQuota, resetQuotaMemory, FREE_DAILY_AI_MESSAGES } = require('../services/binthQuota');
const { callBinth } = require('../services/binthService');

const saved = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks(); resetQuotaMemory(); global.fetch = jest.fn();
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
});
afterEach(() => { process.env = { ...saved }; delete global.fetch; });

test('the free plan gets a daily number of AI answers; paid plans are unlimited', async () => {
  db.execute.mockResolvedValue({ rows: [] });
  let last;
  for (let i = 0; i <= FREE_DAILY_AI_MESSAGES; i++) last = await checkDailyAiQuota(7, 3);
  expect(last.allowed).toBe(false);
  db.execute.mockResolvedValue({ rows: [{ key: 'subscription_tier', value: 'growth' }] });
  expect((await checkDailyAiQuota(7, 3)).allowed).toBe(true);
});

test('over the limit, chat uses local rules and says why', async () => {
  process.env.NODE_ENV = 'production'; process.env.GROQ_API_KEY = 'owner';
  delete process.env.GEMINI_API_KEY; delete process.env.OPENROUTER_API_KEY; delete process.env.AI_CREDENTIALS_ENCRYPTION_KEY;
  db.execute.mockResolvedValue({ rows: [] });
  for (let i = 0; i < FREE_DAILY_AI_MESSAGES; i++) await checkDailyAiQuota(7, 3);
  const result = await callBinth({ messages: [{ role: 'user', content: 'Oi' }], householdId: 7, userId: 3, countTowardsQuota: true });
  expect(fetch).not.toHaveBeenCalled();
  expect(result.data.ai_status.reason).toBe('daily_limit');
});
