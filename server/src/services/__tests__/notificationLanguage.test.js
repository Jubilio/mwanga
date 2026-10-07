jest.mock('../binthService', () => ({ buildUserContext: jest.fn(), callBinth: jest.fn() }));
const { buildFallbackContent } = require('../notificationAi.service');

test.each([
  ['warning', { usagePercent: 80, category: 'Food' }, 'Pressure on Food'],
  ['motivation', { streakDays: 7 }, 'Your financial streak is active'],
  ['reminder', { triggerType: 'monthly_commitments_due' }, 'Monthly commitments ahead'],
  ['reminder', {}, 'Your financial day is still blank'],
])('English automatic %s notifications include English actions', (notificationType, eventContext, title) => {
  const result = buildFallbackContent({ notificationType, eventContext, summary: { userName: 'Alex' }, actionPayload: { date: '2026-10-07' }, language: 'en' });
  expect(result.title).toBe(title);
  expect(result.message).toContain('Alex');
  expect(result.message.length).toBeLessThanOrEqual(128);
  expect(result.quickActions).not.toEqual(expect.arrayContaining(['Fechar o dia', 'Ver orçamento', 'Adicionar despesa']));
});
