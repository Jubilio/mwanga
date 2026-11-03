jest.mock('../services/binthService', () => ({ callBinth: jest.fn(), buildUserContext: jest.fn() }));
jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), debug: jest.fn() }));
const { getPageInsight } = require('../controllers/binth.controller');
const { callBinth } = require('../services/binthService');
const { db } = require('../config/db');
const { clearMemoryCache } = require('../services/binthInsightCache');

const savedRedis = [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN];
beforeAll(() => { delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; });
afterAll(() => { [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN] = savedRedis; });
function request(query = {}) { return { params: { page: 'dashboard' }, query, body: {}, user: { id: 1, householdId: 2 }, get: () => 'pt' }; }
function response() { return { status: jest.fn().mockReturnThis(), json: jest.fn() }; }
beforeEach(() => {
  jest.clearAllMocks(); clearMemoryCache();
  callBinth.mockResolvedValue({ message: 'Insight', data: {} });
  db.execute.mockResolvedValue({ rows: [{ version: 'v1' }] });
});

test('opening the same page twice calls the AI once', async () => {
  await getPageInsight(request(), response());
  const res = response(); await getPageInsight(request(), res);
  expect(callBinth).toHaveBeenCalledTimes(1);
  expect(res.json).toHaveBeenCalledWith({ message: 'Insight', data: {} });
});
test('any change to the data (new or edited record) or the refresh button asks the AI again', async () => {
  await getPageInsight(request(), response());
  db.execute.mockResolvedValue({ rows: [{ version: 'v2' }] });
  await getPageInsight(request(), response());
  await getPageInsight(request({ refresh: '1' }), response());
  expect(callBinth).toHaveBeenCalledTimes(3);
});
