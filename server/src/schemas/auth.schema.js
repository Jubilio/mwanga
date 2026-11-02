const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  householdName: z.string().trim().max(100).optional(),
  inviteCode: z.string().trim().optional()
}).strict();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1)
}).strict();

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  nationalId: z.string().trim().max(50).optional(),
  whatsapp_number: z.string().trim().max(20).optional().or(z.literal('')),
  password: z.string().min(8).max(100).optional()
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email()
}).strict();

// Either the token from the email link, or the email plus the 6-digit code.
const resetPasswordSchema = z.object({
  token: z.string().min(1).max(200).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  code: z.string().trim().regex(/^\d{6}$/).optional(),
  password: z.string().min(8).max(100)
}).strict().refine((data) => Boolean(data.token) || Boolean(data.email && data.code), {
  message: 'Indique o link do email ou o email e o código de 6 dígitos.'
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
