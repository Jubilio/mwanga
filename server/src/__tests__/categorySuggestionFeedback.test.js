jest.mock('../services/behaviorTracking.service', () => ({ trackBehaviorEvent: jest.fn().mockResolvedValue() }));

const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const { trackBehaviorEvent } = require('../services/behaviorTracking.service');
const { recordCategorySuggestion, CATEGORIES } = require('../services/categorySuggestionFeedback');

const ok = { suggested: 'food', chosen: 'food', confidence: 0.8, source: 'memory', version: 'cat-nb-1', channel: 'manual' };

describe('category suggestion feedback', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records an accepted suggestion with categories only', async () => {
    await expect(recordCategorySuggestion({ userId: 1, householdId: 2 }, ok)).resolves.toEqual({ accepted: true });
    expect(trackBehaviorEvent).toHaveBeenCalledWith(expect.objectContaining({
      householdId: 2, eventName: 'category_suggestion_accepted', eventValue: 1, context: ok,
    }));
  });

  it('records a correction', async () => {
    await recordCategorySuggestion({ userId: 1, householdId: 2 }, { ...ok, chosen: 'transport' });
    expect(trackBehaviorEvent.mock.calls[0][0].eventName).toBe('category_suggestion_corrected');
  });

  it('refuses free text such as a description, and unknown categories', async () => {
    await expect(recordCategorySuggestion({ householdId: 2 }, { ...ok, description: 'Tio Zeca' })).rejects.toBeInstanceOf(z.ZodError);
    await expect(recordCategorySuggestion({ householdId: 2 }, { ...ok, chosen: 'Outros' })).rejects.toBeInstanceOf(z.ZodError);
    expect(trackBehaviorEvent).not.toHaveBeenCalled();
  });

  it('knows the same categories as the app', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../../src/utils/categories.js'), 'utf8');
    const block = source.match(/MAIN_CATEGORIES = \[([^\]]+)\]/)[1];
    const appCategories = [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect([...CATEGORIES].sort()).toEqual(appCategories.sort());
  });
});
