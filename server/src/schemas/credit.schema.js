const { z } = require('zod');

const submitApplicationSchema = z.object({
  amount: z.string().or(z.number()).transform(v => parseFloat(v)).pipe(z.number().positive().max(3000000)),
  months: z.string().or(z.number()).transform(v => parseInt(v)).pipe(z.number().int().positive().max(120)),
  partner: z.string().min(2).max(100).trim(),
  purpose: z.string().min(2).max(500).trim(),
  // Consentimento explícito para calcular o score com as transacções do utilizador.
  scoreConsent: z.union([z.boolean(), z.enum(['true', 'false'])]).transform(v => v === true || v === 'true'),
}).strict();

const partnerDisbursementSchema = z.object({
  // Número do contrato ou referência do desembolso no sistema do parceiro licenciado.
  partnerReference: z.string().min(2).max(100).trim(),
  rate: z.string().or(z.number()).transform(v => parseFloat(v)).pipe(z.number().min(0).max(1)).optional(),
}).strict();

module.exports = {
  submitApplicationSchema,
  partnerDisbursementSchema
};
