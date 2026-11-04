jest.mock('../advisor.service', () => ({
  LEVELS: ['off', 'discreet', 'normal', 'close'],
  PLAN_KINDS: ['salary', 'monthly', 'debt', 'emergency', 'goal', 'credit'],
  updateSettings: jest.fn(async (h, c) => c),
  createPlan: jest.fn(async () => ({ id: 1 })),
  createReminder: jest.fn(async () => { throw new Error('BAD_DATE'); }),
  addMemory: jest.fn(async () => { throw new Error('FULL'); }),
}));
const ctl = require('../../../controllers/advisor.controller');
const advisor = require('../advisor.service');

function call(handler, body) {
  return new Promise((resolve) => {
    const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(b) { resolve({ status: this.statusCode, body: b }); } };
    handler({ body, params: {}, query: {}, get: () => '', user: { id: 7, householdId: 3 } }, res);
  });
}

test('settings reject unknown keys and bad values', async () => {
  expect((await call(ctl.updateSettings, { level: 'loud' })).status).toBe(400);
  expect((await call(ctl.updateSettings, { householdId: 9 })).status).toBe(400);
  const ok = await call(ctl.updateSettings, { level: 'close', quietStart: 22 });
  expect(ok.status).toBe(200);
  expect(advisor.updateSettings).toHaveBeenCalledWith(3, { level: 'close', quietStart: 22 });
});

test('plans need a known kind and a small payload', async () => {
  expect((await call(ctl.createPlan, { kind: 'lottery', title: 'x', data: {} })).status).toBe(400);
  expect((await call(ctl.createPlan, { kind: 'debt', title: 'x', data: { blob: 'x'.repeat(21000) } })).status).toBe(400);
  expect((await call(ctl.createPlan, { kind: 'debt', title: 'Sair das dívidas', data: { months: 4 } })).status).toBe(201);
});

test('service errors map to client errors', async () => {
  expect((await call(ctl.createReminder, { date: '2026-12-01', text: 'x' })).status).toBe(400);
  expect((await call(ctl.addMemory, { fact: 'Recebe a 25' })).status).toBe(409);
});
