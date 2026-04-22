const { z } = require('zod');

const budgetSchema = z.object({
  category: z.string().min(1).max(50).trim(),
  limit: z.number().nonnegative(),
}).strict();

module.exports = {
  budgetSchema,
};
