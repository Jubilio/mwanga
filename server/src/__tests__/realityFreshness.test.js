jest.mock('../config/db', () => ({ db: {} }));
const { withFreshness } = require('../services/binthService');
test.each(['en', 'pt'])('marks provider responses with an explicit review notice in %s', language => {
  const freshness = { needsReview: true, available: true };
  const response = withFreshness({ message: 'Recommendation', data: { amount: 10 } }, { freshness }, language);
  expect(response.message).toMatch(language === 'en' ? /needs confirmation/ : /precisam de confirmação/);
  expect(response.data).toEqual({ amount: 10, freshness });
});
test('keeps confirmed-data recommendations unchanged', () => {
  expect(withFreshness({ message: 'Recommendation' }, { freshness: { needsReview: false } }, 'en').message).toBe('Recommendation');
});
