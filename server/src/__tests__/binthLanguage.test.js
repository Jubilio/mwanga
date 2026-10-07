const { resolveLanguage, englishFallback, buildLanguageInstruction } = require('../services/binthLanguage');
test('resolves regional language tags and defaults to Portuguese', () => {
  expect(resolveLanguage('en-GB,en;q=0.9')).toBe('en');
  expect(resolveLanguage('pt-MZ')).toBe('pt');
  expect(resolveLanguage('fr')).toBe('pt');
});
test('English fallback handles missing and negative data explicitly', () => {
  expect(englishFallback('', {}).message).toContain('Record income');
  const result = englishFallback('budget', { monthlyIncome: 100, monthlyExpenses: 200 });
  expect(result.message).toContain('exceed income by 100 MT');
  expect(result.insight_type).toBe('warning');
});
test('debt advice does not invent an interest rate or ranking', () => {
  expect(englishFallback('loan repayment', { debtTotal: 500 }).message).toContain('Missing rates');
});
test('language instructions apply to all response values', () => {
  expect(buildLanguageInstruction('en')).toContain('action label');
  expect(buildLanguageInstruction('pt')).toContain('português');
});
