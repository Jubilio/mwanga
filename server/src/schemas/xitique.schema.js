const { z } = require('zod');

const xitiqueSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  monthlyAmount: z.number().positive(),
  totalParticipants: z.number().int().min(2).max(50),
  startDate: z.string().min(10).max(10), // YYYY-MM-DD
  yourPosition: z.number().int().positive(),
}).strict();

const xitiquePaymentSchema = z.object({
  date: z.string().min(10).max(10),
  account_id: z.coerce.number().optional(),
}).strict();

module.exports = {
  xitiqueSchema,
  xitiquePaymentSchema
};
