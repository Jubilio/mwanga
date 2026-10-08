const { z } = require('zod');
const money = z.union([z.number(), z.string().trim().min(1)]).pipe(z.coerce.number().finite().min(0).max(1e12));
const schema = {
  user_salary: money, default_rent: money,
  financial_month_start_day: z.union([z.number(), z.string().trim().min(1)]).pipe(z.coerce.number().int().min(1).max(31)),
  currency: z.enum(['MT', 'USD', 'EUR', 'ZAR']),
  daily_entry_reminder_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  monthly_due_reminder_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  monthly_due_reminder_period: z.enum(['inicio', 'fim']),
  default_income_account_id: z.union([z.literal(''), z.number().int().positive(), z.string().regex(/^[1-9]\d*$/)]),
  default_expense_account_id: z.union([z.literal(''), z.number().int().positive(), z.string().regex(/^[1-9]\d*$/)]),
};
for (const key of ['daily_entry_reminder_enabled', 'monthly_due_reminder_enabled', 'debt_due_reminder_enabled', 'sms_automation_enabled']) schema[key] = z.union([z.boolean(), z.enum(['true', 'false'])]);
function validateSetting(key, value) { return schema[key] ? schema[key].parse(value) : value; }
module.exports = { validateSetting };
