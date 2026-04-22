const { z } = require('zod');

const ACCOUNT_TYPE_ALIASES = {
  cash: 'dinheiro',
  bank: 'banco',
  mobile: 'outro',
  mobile_money: 'outro',
  'm-pesa': 'mpesa',
  mpesa: 'mpesa',
  'e-mola': 'emola',
  emola: 'emola',
  'm-kesh': 'mkesh',
  mkesh: 'mkesh',
  corrente: 'banco',
  poupanca: 'banco',
  investimento: 'outro'
};

const normalizeAccountType = (type) => ACCOUNT_TYPE_ALIASES[type] || type;
const ALLOWED_ACCOUNT_TYPES = ['dinheiro', 'mpesa', 'emola', 'mkesh', 'banco', 'outro'];

const addAccountSchema = z.object({
  name: z.coerce.string().trim().min(1).max(50),
  type: z.coerce.string()
    .trim()
    .toLowerCase()
    .transform(normalizeAccountType)
    .refine((value) => ALLOWED_ACCOUNT_TYPES.includes(value), { message: 'Tipo de conta inválido' }),
  initial_balance: z.coerce.number().finite(),
});

const updateBalanceSchema = z.object({
  current_balance: z.coerce.number(),
}).strict();

module.exports = {
  addAccountSchema,
  updateBalanceSchema
};
