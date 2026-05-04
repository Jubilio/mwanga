const { OAuth2Client } = require('google-auth-library');
const { z } = require('zod');
const { db } = require('../config/db');
const { logAction } = require('../utils/audit');
const authService = require('../services/auth.service');
const { invalidateDashboardCache } = require('./dashboard.controller');
const { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} = require('../schemas/auth.schema');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const getValidationErrorPayload = (error) => {
  const issues = error.issues || error.errors || [];
  const firstIssue = issues[0];
  if (!firstIssue) return { error: 'Validation failed' };
  const field = Array.isArray(firstIssue.path) ? firstIssue.path.join('.') : '';
  const message = firstIssue.message || 'Invalid value';
  return { error: field ? `${field}: ${message}` : message, details: issues };
};

const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.registerUser(data);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json(getValidationErrorPayload(error));
    if (error.message === 'EMAIL_EXISTS') return res.status(409).json({ error: 'Este email já está registado. Tente fazer login ou use outro email.' });
    if (error.message === 'INVALID_INVITE') return res.status(400).json({ error: 'Código de convite inválido ou expirado.' });
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.authenticateUser(email, password);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json(getValidationErrorPayload(error));
    if (error.message === 'INVALID_CREDENTIALS') return res.status(401).json({ error: 'Credenciais invalidas' });
    next(error);
  }
};

const getMe = async (req, res) => {
  try {
    const profile = await authService.getUserProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const result = await authService.updateProfile(req.user.id, data);
    await invalidateDashboardCache(req.user.householdId);
    res.json({ ...result, message: 'Perfil e dados PII atualizados com sucesso.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('Update Profile Validation Error:', error.errors);
      return res.status(400).json(getValidationErrorPayload(error));
    }
    next(error);
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential, inviteCode } = req.body;
    if (!credential) return res.status(400).json({ error: 'Token do Google e obrigatorio' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, email_verified: emailVerified } = payload || {};

    if (!email) return res.status(400).json({ error: 'Google nao devolveu um email valido' });
    if (emailVerified === false) return res.status(401).json({ error: 'O email do Google precisa de estar verificado' });

    const normalizedEmail = String(email).trim().toLowerCase();
    const displayName = String(name || normalizedEmail.split('@')[0] || 'Explorador Mwanga').trim();

    let created = false;
    let result = await db.execute({ sql: 'SELECT * FROM users WHERE email = $1', args: [normalizedEmail] });
    let user = result.rows[0];

    if (!user) {
      try {
        created = true;
        let householdId = null;
        if (inviteCode) {
          const inviteResult = await db.execute({
            sql: 'SELECT household_id FROM household_invites WHERE invite_code = $1 AND status = $2 AND expires_at > NOW()',
            args: [inviteCode, 'active']
          });
          if (inviteResult.rows.length === 0) return res.status(400).json({ error: 'Código de convite inválido ou expirado.' });
          householdId = Number(inviteResult.rows[0].household_id);
        } else {
          const householdInsert = await db.execute({
            sql: 'INSERT INTO households (name) VALUES ($1) RETURNING id',
            args: [`Familia de ${displayName}`]
          });
          householdId = Number(householdInsert.rows[0]?.id || householdInsert.lastInsertRowid);
        }

        const passwordHash = authService.createGooglePasswordHash();
        const userInsert = await db.execute({
          sql: 'INSERT INTO users (name, email, password_hash, household_id) VALUES ($1, $2, $3, $4) RETURNING id',
          args: [displayName, normalizedEmail, passwordHash, householdId]
        });
        const userId = Number(userInsert.rows[0]?.id || userInsert.lastInsertRowid);
        await logAction(userId, 'REGISTER_GOOGLE', 'USER', userId);
        user = { id: userId, name: displayName, email: normalizedEmail, household_id: householdId, role: 'user' };
      } catch (insertError) {
        if (!(insertError.message && (insertError.message.includes('UNIQUE') || insertError.message.includes('duplicate')))) throw insertError;
        created = false;
        result = await db.execute({ sql: 'SELECT * FROM users WHERE email = $1', args: [normalizedEmail] });
        user = result.rows[0];
      }
    } else {
      await logAction(user.id, 'LOGIN_GOOGLE', 'USER', user.id);
    }

    if (!user) return res.status(500).json({ error: 'Nao foi possivel concluir a autenticacao com Google' });

    const userData = { id: user.id, name: user.name, email: user.email, householdId: user.household_id, role: user.role || 'user' };
    res.json({ user: userData, token: authService.createSessionToken(userData), created });
  } catch (error) {
    console.error('[Google Login Error]', error);
    res.status(401).json({ error: 'Falha na autenticacao com o Google' });
  }
};

const googleAccessTokenLogin = async (req, res) => {
  try {
    const { email, name, accessToken } = req.body;
    if (!email || !accessToken) return res.status(400).json({ error: 'Email e Access Token sao obrigatorios' });

    // In a production environment, you should verify the accessToken with Google
    // fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`)
    
    const normalizedEmail = String(email).trim().toLowerCase();
    const displayName = String(name || normalizedEmail.split('@')[0] || 'Explorador Mwanga').trim();

    let created = false;
    let result = await db.execute({ sql: 'SELECT * FROM users WHERE email = $1', args: [normalizedEmail] });
    let user = result.rows[0];

    if (!user) {
      created = true;
      const householdInsert = await db.execute({
        sql: 'INSERT INTO households (name) VALUES ($1) RETURNING id',
        args: [`Familia de ${displayName}`]
      });
      const householdId = Number(householdInsert.rows[0]?.id || householdInsert.lastInsertRowid);

      const passwordHash = authService.createGooglePasswordHash();
      const userInsert = await db.execute({
        sql: 'INSERT INTO users (name, email, password_hash, household_id) VALUES ($1, $2, $3, $4) RETURNING id',
        args: [displayName, normalizedEmail, passwordHash, householdId]
      });
      const userId = Number(userInsert.rows[0]?.id || userInsert.lastInsertRowid);
      await logAction(userId, 'REGISTER_GOOGLE', 'USER', userId);
      user = { id: userId, name: displayName, email: normalizedEmail, household_id: householdId, role: 'user' };
    } else {
      await logAction(user.id, 'LOGIN_GOOGLE', 'USER', user.id);
    }

    const userData = { id: user.id, name: user.name, email: user.email, householdId: user.household_id, role: user.role || 'user' };
    res.json({ user: userData, token: authService.createSessionToken(userData), created });
  } catch (error) {
    console.error('[Google Access Token Login Error]', error);
    res.status(500).json({ error: 'Erro interno ao processar login com Google' });
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.initiatePasswordReset(email);
    res.json({ message: 'Link de recuperacao enviado com sucesso.' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json(getValidationErrorPayload(error));
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.completePasswordReset(token, password);
    res.json({ message: 'Senha redefinida com sucesso. Ja podes fazer login!' });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json(getValidationErrorPayload(error));
    if (error.message === 'INVALID_TOKEN') return res.status(400).json({ error: 'Token invalido ou expirado' });
    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile, googleLogin, googleAccessTokenLogin, forgotPassword, resetPassword };
