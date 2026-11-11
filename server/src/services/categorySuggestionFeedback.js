const { z } = require('zod');
const { trackBehaviorEvent } = require('./behaviorTracking.service');

// Must match MAIN_CATEGORIES in src/utils/categories.js.
const CATEGORIES = ['salary', 'house_rent', 'food', 'transport', 'health', 'education', 'energy_water', 'internet', 'church_donations', 'leisure', 'investments', 'savings', 'xitique', 'habitacao', 'other'];

// Only categories and numbers: the description never leaves the device.
const feedbackSchema = z.object({
  suggested: z.enum(CATEGORIES),
  chosen: z.enum(CATEGORIES),
  confidence: z.coerce.number().min(0).max(1),
  source: z.enum(['memory', 'model', 'rules']),
  version: z.string().max(20).regex(/^[a-z0-9-]+$/),
  channel: z.enum(['manual', 'sms_import', 'sms_sync']),
}).strict();

async function recordCategorySuggestion({ userId, householdId }, body) {
  const data = feedbackSchema.parse(body);
  const accepted = data.suggested === data.chosen;
  await trackBehaviorEvent({
    userId,
    householdId,
    eventName: accepted ? 'category_suggestion_accepted' : 'category_suggestion_corrected',
    eventSource: data.channel,
    eventValue: accepted ? 1 : 0,
    context: data,
  });
  return { accepted };
}

module.exports = { recordCategorySuggestion, feedbackSchema, CATEGORIES };
