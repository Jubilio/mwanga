jest.mock('../config/db', () => ({ db: { execute: jest.fn().mockResolvedValue({ rows: [] }) } }));
jest.mock('../services/notificationRead.service', () => ({ getNotificationReadValue: jest.fn().mockResolvedValue(false) }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() }));
const { getFallbackResponse } = require('../services/binthService');

test('the offline interest answer never mentions another person\'s debt', () => {
  const result = getFallbackResponse('tenho juros?', { userName: 'Ana', debts: [] });
  expect(result.message).not.toMatch(/30\.000|Março/);
  expect(result.message).toContain('Ana');
});

test('a tithe question gets a giving answer, not a debt one', () => {
  const result = getFallbackResponse('Quanto de dizimo devo dar do meu salario', { userName: 'Ana', monthlyIncome: 20000, debtTotal: 52500 });
  expect(result.message).toContain('10%');
  expect(result.message).toContain('2'); // MT 2 000
  expect(result.message).not.toMatch(/dívidas pendentes/);
});

test('keywords match whole words only', () => {
  const result = getFallbackResponse('tenho dois carros', { userName: 'Ana' });
  expect(result.data.intent_matched).toBe(false);
  expect(getFallbackResponse('quero poupar mais', { userName: 'Ana', goalCount: 1 }).data.intent_matched).toBe(true);
});
