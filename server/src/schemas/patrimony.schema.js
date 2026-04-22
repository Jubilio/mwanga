const { z } = require('zod');

const assetSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  type: z.string().min(1).max(50).trim(),
  value: z.number().positive(),
}).strict();

const liabilitySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  totalAmount: z.number().positive(),
  remainingAmount: z.number().nonnegative(),
  interestRate: z.number().nonnegative().optional().default(0),
}).strict();

module.exports = {
  assetSchema,
  liabilitySchema
};
