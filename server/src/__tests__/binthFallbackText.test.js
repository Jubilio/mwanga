jest.mock('../config/db', () => ({ db: { execute: jest.fn().mockResolvedValue({ rows: [] }) } }));
jest.mock('../services/notificationRead.service', () => ({ getNotificationReadValue: jest.fn().mockResolvedValue(false) }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() }));
const { getFallbackResponse } = require('../services/binthService');

test('the offline interest answer never mentions another person\'s debt', () => {
  const result = getFallbackResponse('tenho juros?', { userName: 'Ana', debts: [] });
  expect(result.message).not.toMatch(/30\.000|Março/);
  expect(result.message).toContain('Ana');
});
