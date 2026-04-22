const { z } = require('zod');

const submitApplicationSchema = z.object({
  amount: z.string().or(z.number()).transform(v => parseFloat(v)).pipe(z.number().positive().max(3000000)),
  months: z.string().or(z.number()).transform(v => parseInt(v)).pipe(z.number().int().positive().max(120)),
  partner: z.string().min(2).max(100).trim(),
  purpose: z.string().min(2).max(500).trim(),
}).strict();

const disburseLoanSchema = z.object({
  rate: z.string().or(z.number()).transform(v => parseFloat(v)).pipe(z.number().min(0).max(1)),
}).strict();

module.exports = {
  submitApplicationSchema,
  disburseLoanSchema
};
