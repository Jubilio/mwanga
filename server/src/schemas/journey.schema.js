const { z } = require('zod');

const lessonIds = ['purpose', 'assets', 'saving', 'debt', 'mentor', 'ambition', 'habits', 'knowledge', 'respect', 'awareness'];
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
});
const unique = schema => schema.refine(values => new Set(values).size === values.length, 'Duplicate entries');
const journeySchema = z.object({
  version: z.literal(1),
  purpose: z.string().trim().max(200),
  priority: z.enum(['stability', 'debt', 'housing', 'education', 'business', 'investment']),
  goalId: z.number().int().positive().nullable(),
  monthlyContribution: z.number().finite().min(0).max(1e12),
  completedLessons: unique(z.array(z.enum(lessonIds)).max(10)),
  closedDays: unique(z.array(day).max(90)),
  reviewedWeeks: unique(z.array(day.refine(value => new Date(`${value}T12:00:00Z`).getUTCDay() === 1)).max(52)),
}).strict();

function parseJourneySetting(value) {
  if (typeof value === 'string') {
    if (value.length > 16000) throw new z.ZodError([{ code: 'custom', path: ['value'], message: 'Journey is too large' }]);
    try { value = JSON.parse(value); }
    catch { throw new z.ZodError([{ code: 'custom', path: ['value'], message: 'Invalid journey JSON' }]); }
  }
  return journeySchema.parse(value);
}

module.exports = { journeySchema, parseJourneySetting };
