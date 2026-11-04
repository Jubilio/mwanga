// The daily sweep: quiet hours, one proactive message a day, reminders always,
// never the same alert twice.
jest.mock('../../../config/db', () => {
  const mockState = { daily: new Set(), sentAlerts: new Set(), reminders: [], logs: [] };
  const execute = jest.fn(async ({ sql, args }) => {
    if (/FROM advisor_reminders/.test(sql)) return { rows: mockState.reminders.filter(r => !r.sent && r.remind_on <= args[1]), rowCount: 0 };
    if (/UPDATE advisor_reminders/.test(sql)) {
      const r = mockState.reminders.find(x => x.id === args[0] && !x.sent);
      if (!r) return { rows: [], rowCount: 0 };
      r.sent = true;
      return { rows: [{ id: r.id }], rowCount: 1 };
    }
    if (/INSERT INTO advisor_daily/.test(sql)) {
      const k = `${args[0]}:${args[1]}`;
      if (mockState.daily.has(k)) return { rows: [], rowCount: 0 };
      mockState.daily.add(k);
      return { rows: [{ user_id: args[0] }], rowCount: 1 };
    }
    if (/SELECT 1 FROM advisor_sent_alerts/.test(sql)) return { rows: [], rowCount: mockState.sentAlerts.has(`${args[0]}:${args[1]}`) ? 1 : 0 };
    if (/INSERT INTO advisor_sent_alerts/.test(sql)) { mockState.sentAlerts.add(`${args[0]}:${args[1]}`); return { rows: [], rowCount: 1 }; }
    return { rows: [], rowCount: 0 };
  });
  return { db: { execute }, mockState };
});
jest.mock('../advisor.service', () => ({
  getSettings: jest.fn(),
  logAdvice: jest.fn(async () => {}),
  DISCLAIMER: { pt: 'Aviso', en: 'Notice' },
}));
jest.mock('../advisorData', () => ({ loadSnapshot: jest.fn() }));

const { mockState } = require('../../../config/db');
const advisor = require('../advisor.service');
const { loadSnapshot } = require('../advisorData');
const { adviseUser, inQuietHours, whatsappConfigured } = require('../advisorSweep');

const user = { id: 7, household_id: 3, whatsapp_number: '+258840000000' };
const settings = (over = {}) => ({ level: 'normal', quietStart: 21, quietEnd: 7, weekly: true, whatsapp: false, ...over });
// Thursday 2026-11-12, 10:00 in Maputo.
const THU_10 = new Date('2026-11-12T08:00:00Z');
const snapshotWithXitique = () => ({
  balance: 40000, transactions: [], budgets: [], goals: [], plans: [], debts: [], rentDue: [],
  xitiqueDue: [{ contributionId: 9, amount: 1500, due_date: '2026-11-12', name: 'Amigas' }],
  payday: null, prefs: {},
});

let deps;
beforeEach(() => {
  jest.clearAllMocks();
  mockState.daily.clear(); mockState.sentAlerts.clear(); mockState.reminders = [];
  deps = { createNotification: jest.fn(async () => {}), whatsapp: { provider: 'evolution', sendMessage: jest.fn(async () => {}) } };
  advisor.getSettings.mockResolvedValue(settings());
  loadSnapshot.mockResolvedValue(snapshotWithXitique());
});

test('quiet hours wrap around midnight', () => {
  expect(inQuietHours(22, { quietStart: 21, quietEnd: 7 })).toBe(true);
  expect(inQuietHours(6, { quietStart: 21, quietEnd: 7 })).toBe(true);
  expect(inQuietHours(12, { quietStart: 21, quietEnd: 7 })).toBe(false);
  expect(inQuietHours(12, { quietStart: 7, quietEnd: 7 })).toBe(false);
});

test('sends the most important alert once, then nothing more that day', async () => {
  const first = await adviseUser(user, THU_10, deps);
  expect(first).toEqual([{ kind: 'due', id: expect.stringMatching(/^due:x9:/) }]);
  expect(deps.createNotification).toHaveBeenCalledTimes(1);
  expect(deps.createNotification.mock.calls[0][0]).toMatchObject({ userId: 7, type: 'advisor', sendPush: true });
  const again = await adviseUser(user, new Date('2026-11-12T12:00:00Z'), deps);
  expect(again).toEqual([]);
  expect(deps.createNotification).toHaveBeenCalledTimes(1);
});

test('the same alert is not sent again the next day', async () => {
  await adviseUser(user, THU_10, deps);
  const next = await adviseUser(user, new Date('2026-11-13T08:00:00Z'), deps);
  expect(next.find(s => s.id.startsWith('due:x9:2026-11-12'))).toBeUndefined();
});

test('nothing during quiet hours, not even reminders', async () => {
  mockState.reminders = [{ id: 1, text: 'Pagar escola', remind_on: '2026-11-12' }];
  const sent = await adviseUser(user, new Date('2026-11-12T20:00:00Z'), deps); // 22:00 in Maputo
  expect(sent).toEqual([]);
  expect(deps.createNotification).not.toHaveBeenCalled();
});

test('reminders are delivered even when the advisor is off', async () => {
  advisor.getSettings.mockResolvedValue(settings({ level: 'off' }));
  mockState.reminders = [{ id: 1, text: 'Pagar escola', remind_on: '2026-11-12' }];
  const sent = await adviseUser(user, THU_10, deps);
  expect(sent).toEqual([{ kind: 'reminder', id: 1 }]);
  expect(deps.createNotification.mock.calls[0][0].message).toBe('Pagar escola');
  expect(loadSnapshot).not.toHaveBeenCalled();
  // Claimed once: a second run does not repeat it.
  expect(await adviseUser(user, THU_10, deps)).toEqual([]);
});

test('discreet level skips priority 2 alerts', async () => {
  advisor.getSettings.mockResolvedValue(settings({ level: 'discreet' }));
  loadSnapshot.mockResolvedValue({ ...snapshotWithXitique(), xitiqueDue: [{ contributionId: 9, amount: 1500, due_date: '2026-11-14', name: 'Amigas' }] });
  expect(await adviseUser(user, THU_10, deps)).toEqual([]);
});

test('WhatsApp only when the person turned it on and the server is configured', async () => {
  advisor.getSettings.mockResolvedValue(settings({ whatsapp: true }));
  await adviseUser(user, THU_10, deps);
  expect(deps.whatsapp.sendMessage).not.toHaveBeenCalled();

  process.env.EVOLUTION_URL = 'https://evo.example'; process.env.EVOLUTION_API_KEY = 'k'; process.env.EVOLUTION_INSTANCE = 'i';
  try {
    expect(whatsappConfigured(deps.whatsapp)).toBe(true);
    await adviseUser(user, new Date('2026-11-13T08:00:00Z'), { ...deps, createNotification: jest.fn(async () => {}) });
    // The xitique alert was already sent on the 12th; the 13th has the overdue one (new id).
    expect(deps.whatsapp.sendMessage).toHaveBeenCalledWith('+258840000000', expect.stringContaining('Aviso'));
  } finally {
    delete process.env.EVOLUTION_URL; delete process.env.EVOLUTION_API_KEY; delete process.env.EVOLUTION_INSTANCE;
  }
});
