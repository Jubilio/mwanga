jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../services/notificationRead.service', () => ({ getNotificationReadValue: jest.fn().mockResolvedValue(false) }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() }));
jest.mock('../services/toolRegistry', () => ({ getToolsSchema: jest.fn().mockReturnValue([]), executeTool: jest.fn() }));
const { db } = require('../config/db');
const { checkDailyAiQuota, FREE_DAILY_AI_MESSAGES } = require('../services/binthQuota');
const { callBinth } = require('../services/binthService');

// Postgres stand-in: settings rows plus the binth_daily_usage counter.
let counter;
let settingsRows;
function fakeDb() {
  db.execute.mockImplementation(async ({ sql }) => {
    if (sql.includes('binth_daily_usage')) { counter += 1; return { rows: [{ count: counter }] }; }
    if (sql.includes('FROM settings')) return { rows: settingsRows };
    return { rows: [] };
  });
}

const saved = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks(); global.fetch = jest.fn();
  counter = 0; settingsRows = [];
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
  fakeDb();
});
afterEach(() => { process.env = { ...saved }; delete global.fetch; });

test('the free plan gets a daily number of AI answers; paid plans are unlimited', async () => {
  let last;
  for (let i = 0; i <= FREE_DAILY_AI_MESSAGES; i++) last = await checkDailyAiQuota(7, 3);
  expect(last.allowed).toBe(false);
  settingsRows = [{ key: 'subscription_tier', value: 'growth' }];
  expect((await checkDailyAiQuota(7, 3)).allowed).toBe(true);
});

test('the count lives in Postgres, so a restart or a second instance does not reset it', async () => {
  counter = FREE_DAILY_AI_MESSAGES; // already used today, counted elsewhere
  expect((await checkDailyAiQuota(7, 3)).allowed).toBe(false);
  const sql = db.execute.mock.calls.map(c => c[0].sql).find(s => s.includes('binth_daily_usage'));
  expect(sql).toContain('ON CONFLICT');
});

test('if the counter cannot be read, Mwanga AI is refused for that message', async () => {
  db.execute.mockImplementation(async ({ sql }) => {
    if (sql.includes('binth_daily_usage')) throw new Error('db down');
    return { rows: [] };
  });
  const result = await checkDailyAiQuota(7, 3);
  expect(result).toMatchObject({ allowed: false, unavailable: true });
});

test('over the limit, chat uses local rules and says why', async () => {
  process.env.NODE_ENV = 'production'; process.env.GROQ_API_KEY = 'owner';
  delete process.env.GEMINI_API_KEY; delete process.env.OPENROUTER_API_KEY; delete process.env.AI_CREDENTIALS_ENCRYPTION_KEY;
  counter = FREE_DAILY_AI_MESSAGES;
  const result = await callBinth({ messages: [{ role: 'user', content: 'Oi' }], householdId: 7, userId: 3, countTowardsQuota: true });
  expect(fetch).not.toHaveBeenCalled();
  expect(result.data.ai_status.reason).toBe('daily_limit');
});
