const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { z } = require('zod');
const crypto = require('crypto');
const { db } = require('../config/db');
const { logAction } = require('../utils/audit');
const { JWT_SECRET } = require('../middleware/auth.middleware');
const emailService = require('../services/email.service');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createSessionToken = (user) =>
  jwt.sign(
    { id: user.id, householdId: user.householdId, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

const createGooglePasswordHash = () => {
  const salt = bcrypt.genSaltSync(10);
  const generatedPassword = crypto.randomBytes(24).toString('hex');
  return bcrypt.hashSync(generatedPassword, salt);
};

const getValidationErrorPayload = (error) => {
  const issues = error.issues || error.errors || [];
  const firstIssue = issues[0];

  if (!firstIssue) {
    return { error: 'Validation failed' };
  }

  const field = Array.isArray(firstIssue.path) ? firstIssue.path.join('.') : '';
  const message = firstIssue.message || 'Invalid value';

  return {
    error: field ? `${field}: ${message}` : message,
    details: issues
  };
};

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  householdName: z.string().trim().max(100).optional()
}).strict();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1)
}).strict();

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100)
}).strict();

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email()
}).strict();

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100)
}).strict();

const register = async (req, res, next) => {
  try {
    const { name, email, password, householdName } = registerSchema.parse(req.body);

    const householdInsert = await db.execute({
      sql: 'INSERT INTO households (name) VALUES ($1) RETURNING id',
      args: [householdName || `${name}'s Home`]
    });
    const householdId = Number(householdInsert.rows[0]?.id || householdInsert.lastInsertRowid);

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const userInsert = await db.execute({
      sql: 'INSERT INTO users (name, email, password_hash, household_id) VALUES ($1, $2, $3, $4) RETURNING id',
      args: [name, email, hash, householdId]
    });
    const userId = Number(userInsert.rows[0]?.id || userInsert.lastInsertRowid);

    await logAction(userId, 'REGISTER', 'USER', userId);

    const user = { id: userId, name, email, householdId, role: 'user' };
    const token = createSessionToken(user);

    res.status(201).json({ user, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(getValidationErrorPayload(error));
    }

    if (error.message && (error.message.includes('UNIQUE constraint') || error.message.includes('duplicate key'))) {
      return res.status(400).json({ error: 'Email ja existe' });
    }

    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = $1',
      args: [email]
    });
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      householdId: user.household_id,
      role: user.role || 'user'
    };

    await logAction(user.id, 'LOGIN', 'USER', user.id);
    res.json({ user: userData, token: createSessionToken(userData) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(getValidationErrorPayload(error));
    }

    next(error);
  }
};

const getMe = async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = $1',
    args: [req.user.id]
  });
  const user = result.rows[0];

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password_hash, household_id, ...data } = user;
  res.json({ ...data, householdId: household_id, role: user.role || 'user' });
};

const updateProfile = async (req, res, next) => {
  try {
    const { name } = updateProfileSchema.parse(req.body);

    await db.execute({
      sql: 'UPDATE users SET name = $1 WHERE id = $2',
      args: [name, req.user.id]
    });

    await logAction(req.user.id, 'UPDATE_PROFILE', 'USER', req.user.id);
    res.json({ success: true, name });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(getValidationErrorPayload(error));
    }

    next(error);
  }
};

const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Token do Google e obrigatorio' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, email_verified: emailVerified } = payload || {};

    if (!email) {
      return res.status(400).json({ error: 'Google nao devolveu um email valido' });
    }

    if (emailVerified === false) {
      return res.status(401).json({ error: 'O email do Google precisa de estar verificado' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const displayName = String(name || normalizedEmail.split('@')[0] || 'Utilizador Mwanga').trim();

    let created = false;
    let result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = $1',
      args: [normalizedEmail]
    });
    let user = result.rows[0];

    if (!user) {
      try {
        created = true;
        const householdInsert = await db.execute({
          sql: 'INSERT INTO households (name) VALUES ($1) RETURNING id',
          args: [`Familia de ${displayName}`]
        });
        const householdId = Number(householdInsert.rows[0]?.id || householdInsert.lastInsertRowid);

        const passwordHash = createGooglePasswordHash();
        const userInsert = await db.execute({
          sql: 'INSERT INTO users (name, email, password_hash, household_id) VALUES ($1, $2, $3, $4) RETURNING id',
          args: [displayName, normalizedEmail, passwordHash, householdId]
        });
        const userId = Number(userInsert.rows[0]?.id || userInsert.lastInsertRowid);

        await logAction(userId, 'REGISTER_GOOGLE', 'USER', userId);
        user = { id: userId, name: displayName, email: normalizedEmail, household_id: householdId, role: 'user' };
      } catch (insertError) {
        if (!(insertError.message && (insertError.message.includes('UNIQUE constraint') || insertError.message.includes('duplicate key')))) {
          throw insertError;
        }

        created = false;
        result = await db.execute({
          sql: 'SELECT * FROM users WHERE email = $1',
          args: [normalizedEmail]
        });
        user = result.rows[0];
      }
    } else {
      await logAction(user.id, 'LOGIN_GOOGLE', 'USER', user.id);
    }

    if (!user) {
      return res.status(500).json({ error: 'Nao foi possivel concluir a autenticacao com Google' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      householdId: user.household_id,
      role: user.role || 'user'
    };

    res.json({ user: userData, token: createSessionToken(userData), created });
  } catch (error) {
    console.error('[Google Login Error]', error);
    res.status(401).json({ error: 'Falha na autenticacao com o Google' });
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = $1',
      args: [email]
    });
    const user = result.rows[0];

    if (!user) {
      return res.json({ message: 'Se o email existir, receberas um link de recuperacao em breve.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000);

    await db.execute({
      sql: 'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
      args: [token, expires.toISOString(), user.id]
    });

    await emailService.sendPasswordReset(email, token, user.name);
    res.json({ message: 'Link de recuperacao enviado com sucesso.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(getValidationErrorPayload(error));
    }

    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      args: [token]
    });
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Token invalido ou expirado' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    await db.execute({
      sql: 'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      args: [hash, user.id]
    });

    await logAction(user.id, 'RESET_PASSWORD', 'USER', user.id);
    res.json({ message: 'Senha redefinida com sucesso. Ja podes fazer login!' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(getValidationErrorPayload(error));
    }

    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile, googleLogin, forgotPassword, resetPassword };
