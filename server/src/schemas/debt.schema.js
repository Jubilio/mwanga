const { z } = require('zod');

const addDebtSchema = z.object({
  creditor_name: z.string().min(1).max(100).trim(),
  total_amount: z.coerce.number().positive(),
  due_date: z.string().optional().nullable(),
  account_id: z.coerce.number().optional().nullable(),
}).strict();

const addPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  payment_date: z.string(),
  account_id: z.coerce.number().optional().nullable(),
}).strict();

module.exports = {
  addDebtSchema,
  addPaymentSchema
};
