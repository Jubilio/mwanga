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
  password: z.string().min(8).max(100).optional()
}).strict();

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email()
}).strict();

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100)
}).strict();

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
