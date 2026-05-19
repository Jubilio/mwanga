const { z } = require('zod');

const addDebtSchema = z.object({
  creditor_name: z.string().min(1).max(100).trim(),
  total_amount: z.coerce.number().positive(),
  due_date: z.string().optional().nullable(),
  account_id: z.coerce.number().optional().nullable(),
  interest_rate: z.coerce.number().optional().nullable(),
  interest_period: z.string().optional().nullable(),
  months_duration: z.coerce.number().optional().nullable(),
  monthly_payment: z.coerce.number().optional().nullable(),
  principal_amount: z.coerce.number().optional().nullable(),
});

const addPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  payment_date: z.string(),
  account_id: z.coerce.number().optional().nullable(),
});

module.exports = {
  addDebtSchema,
  addPaymentSchema
};
