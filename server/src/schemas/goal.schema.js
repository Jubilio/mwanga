const { z } = require('zod');

const goalSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  targetAmount: z.number().positive(),
  savedAmount: z.number().nonnegative().optional().default(0),
  deadline: z.string().optional(),
  category: z.string().max(50).trim().optional(),
  monthlySaving: z.number().nonnegative().optional().default(0),
}).strict();

const updateGoalSchema = z.object({
  savedAmount: z.coerce.number().nonnegative().optional(),
  account_id: z.coerce.number().optional(),
  increment: z.coerce.number().optional(),
}).strict();

module.exports = {
  goalSchema,
  updateGoalSchema
};
