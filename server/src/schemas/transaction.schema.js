const { z } = require('zod');

const transactionSchema = z.object({
  date: z.string().min(10).max(10),
  type: z.enum(['receita', 'despesa', 'renda', 'poupanca', 'levantamento', 'deposito']),
  description: z.string().max(255).trim().optional(),
  amount: z.coerce.number().positive(),
  category: z.string().max(100).trim().optional(),
  note: z.string().max(1000).trim().optional(),
  account_id: z.coerce.number().optional(),
}).strict();

module.exports = {
  transactionSchema
};
