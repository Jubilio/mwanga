jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../services/notificationRead.service', () => ({ getNotificationReadValue: jest.fn().mockResolvedValue(false) }));
jest.mock('../services/realityReview.service', () => ({ getFreshness: jest.fn().mockResolvedValue({ needsReview: true }) }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() }));
jest.mock('../services/toolRegistry', () => ({ getToolsSchema: jest.fn().mockReturnValue([]), executeTool: jest.fn() }));
const { db } = require('../config/db');
const { buildUserContext, callBinth } = require('../services/binthService');

function fakeDb() {
  db.execute.mockImplementation(async ({ sql }) => {
    if (sql.includes('FROM public.users')) return { rows: [{ name: 'Ana Maria Machava' }] };
    if (sql.includes('GROUP BY category')) return { rows: [{ category: 'Alimentação', total: 4200 }, { category: 'Transporte', total: 900 }] };
    if (sql.includes('ORDER BY date DESC')) return { rows: [{ date: '2026-11-02', description: 'Transferido para 841234567 ref 99887766', amount: 500, type: 'despesa', category: 'Transporte' }] };
    if (sql.includes('FROM debts') && sql.includes('SELECT *')) return { rows: [{ creditor_name: 'Banco X', remaining_amount: 10000, interest_rate: 0.05, interest_period: 'monthly', due_date: '2026-11-20' }] };
    return { rows: [] };
  });
}
beforeEach(() => { jest.clearAllMocks(); fakeDb(); global.fetch = jest.fn(); });
afterEach(() => { delete global.fetch; });

test('the context has spending by category, debts with interest and only the first name', async () => {
  const ctx = await buildUserContext(7, 3);
  expect(ctx.text).toContain('Alimentação: MT 4');
  expect(ctx.text).toContain('Banco X: falta MT 10');
  expect(ctx.text).toContain('juro 5% ao mês');
  expect(ctx.text).toContain('Ana');
  expect(ctx.text).not.toContain('Machava');
});

test('phone numbers and long references never reach the AI', async () => {
  const ctx = await buildUserContext(7, 3);
  expect(ctx.text).not.toContain('841234567');
  expect(ctx.text).not.toContain('99887766');
  expect(ctx.text).toContain('[telefone]');
});

const gemini = text => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });

test('greets and shows the data notice only on the first message', async () => {
  fetch.mockResolvedValue(gemini('{"message":"Certo.","quick_actions":[]}'));
  const first = await callBinth({ messages: [{ role: 'user', content: 'Oi' }], householdId: 7, userId: 3, apiKey: 'k', provider: 'gemini' });
  expect(JSON.parse(fetch.mock.calls[0][1].body).system_instruction.parts[0].text).toContain('primeira mensagem');
  expect(first.message).toContain('precisam de confirmação');

  const later = await callBinth({ messages: [{ role: 'user', content: 'Oi' }, { role: 'assistant', content: 'Olá' }, { role: 'user', content: 'E as dívidas?' }], householdId: 7, userId: 3, apiKey: 'k', provider: 'gemini' });
  expect(JSON.parse(fetch.mock.calls[1][1].body).system_instruction.parts[0].text).toContain('não voltes a saudar');
  expect(later.message).toBe('Certo.');
});
