const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth.middleware');
const emailService = require('../services/email.service');
const { logAction } = require('../utils/audit');
const cryptoService = require('../utils/crypto.service');

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

const registerUser = async (data) => {
  const { name, email, password, householdName, inviteCode } = data;

  // Pre-check: does this email already exist?
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email = $1',
    args: [email]
  });
  if (existing.rows.length > 0) {
    throw new Error('EMAIL_EXISTS');
  }

  let householdId = null;

  if (inviteCode) {
    const inviteResult = await db.execute({
      sql: 'SELECT household_id FROM household_invites WHERE invite_code = $1 AND status = $2 AND expires_at > NOW()',
      args: [inviteCode, 'active']
    });
    
    if (inviteResult.rows.length === 0) {
      throw new Error('INVALID_INVITE');
    }
    householdId = Number(inviteResult.rows[0].household_id);
  } else {
    const householdInsert = await db.execute({
      sql: 'INSERT INTO households (name) VALUES ($1) RETURNING id',
      args: [householdName || `${name}'s Home`]
    });
    householdId = Number(householdInsert.rows[0]?.id || householdInsert.lastInsertRowid);
  }

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

  return { user, token };
};

const authenticateUser = async (email, password) => {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE email = $1',
    args: [email]
  });
  const user = result.rows[0];

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    householdId: user.household_id,
    role: user.role || 'user'
  };

  await logAction(user.id, 'LOGIN', 'USER', user.id);
  
  // Asynchronously evaluate badges
  const { evaluateUserBadges } = require('./gamificationEngine.service');
  evaluateUserBadges(user.id, user.household_id).catch(() => {});
  
  return { user: userData, token: createSessionToken(userData) };
};

const getUserProfile = async (userId) => {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = $1',
    args: [userId]
  });
  const user = result.rows[0];

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const { password_hash, household_id, ...data } = user;
  
  const nationalIdRaw = data.nationalId || data.national_id;
  if (nationalIdRaw) {
    data.nationalId = cryptoService.decrypt(nationalIdRaw) || nationalIdRaw;
    delete data.national_id;
  }

  return { ...data, householdId: household_id, role: user.role || 'user' };
};

const updateProfile = async (userId, data) => {
  const { name, nationalId, whatsapp_number, password } = data;

  let updates = [];
  let args = [];
  let paramCount = 1;

  if (name) {
    updates.push(`name = $${paramCount++}`);
    args.push(name);
  }

  if (nationalId) {
    updates.push(`"nationalId" = $${paramCount++}`);
    args.push(cryptoService.encrypt(nationalId));
  }

  if (whatsapp_number !== undefined) {
    updates.push(`whatsapp_number = $${paramCount++}`);
    args.push(whatsapp_number ? whatsapp_number.replace(/\D/g, '') : null);
  }

  if (password) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    updates.push(`password_hash = $${paramCount++}`);
    args.push(hash);
  }

  if (updates.length > 0) {
    args.push(userId);
    await db.execute({
      sql: `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      args: args
    });
    await logAction(userId, 'UPDATE_PROFILE', 'USER', userId);
  }

  return { success: true };
};

// Password recovery: the email carries a link (token) and a 6-digit code, so a user
// who opens the email on another device, or inside the Android app, can still finish.
// Only hashes are stored. A code allows 5 wrong tries before it is burned.
const RESET_TTL_MS = 60 * 60 * 1000;
const ADMIN_RESET_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

const hashResetToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const hashResetCode = (userId, code) =>
  crypto.createHmac('sha256', JWT_SECRET).update(`reset:${Number(userId)}:${String(code)}`).digest('hex');

const initPasswordResetSchema = async () => {
  const statements = [
    'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reset_password_code_hash TEXT',
    'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS reset_password_attempts INTEGER NOT NULL DEFAULT 0',
  ];
  try {
    for (const sql of statements) await db.execute({ sql, args: [] });
  } catch (error) {
    console.warn(`[auth] Failed to prepare password reset columns: ${error.message}`);
  }
};

const issuePasswordReset = async (userId, ttlMs = RESET_TTL_MS) => {
  const token = crypto.randomBytes(32).toString('hex');
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const expires = new Date(Date.now() + ttlMs);

  await db.execute({
    sql: 'UPDATE users SET reset_password_token = $1, reset_password_code_hash = $2, reset_password_attempts = 0, reset_password_expires = $3 WHERE id = $4',
    args: [hashResetToken(token), hashResetCode(userId, code), expires.toISOString(), userId]
  });
  return { token, code, expires };
};

const initiatePasswordReset = async (email) => {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE email = $1',
    args: [String(email).trim().toLowerCase()]
  });
  const user = result.rows[0];

  if (!user) {
    return { success: true }; // Security: don't reveal if user exists
  }

  const { token, code } = await issuePasswordReset(user.id);
  await emailService.sendPasswordReset(user.email, token, user.name, code);
  return { success: true };
};

// Admin fallback when the email never arrives: a longer-lived link and code the
// admin passes to the user (for example on WhatsApp) after confirming who they are.
const createAdminPasswordReset = async (userId, adminId) => {
  const result = await db.execute({ sql: 'SELECT id, email, name FROM users WHERE id = $1', args: [userId] });
  const user = result.rows[0];
  if (!user) throw new Error('USER_NOT_FOUND');

  const { token, code, expires } = await issuePasswordReset(user.id, ADMIN_RESET_TTL_MS);
  await logAction(adminId, 'ADMIN_PASSWORD_RESET_LINK', 'USER', user.id);
  return {
    url: emailService.passwordResetUrl(token),
    code,
    email: user.email,
    expiresAt: expires.toISOString()
  };
};

const setNewPassword = async (userId, password) => {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  await db.execute({
    sql: 'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_code_hash = NULL, reset_password_attempts = 0, reset_password_expires = NULL WHERE id = $2',
    args: [hash, userId]
  });

  await logAction(userId, 'RESET_PASSWORD', 'USER', userId);
  return { success: true };
};

const completePasswordReset = async (token, password) => {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
    args: [hashResetToken(token)]
  });
  const user = result.rows[0];

  if (!user) {
    throw new Error('INVALID_TOKEN');
  }

  return setNewPassword(user.id, password);
};

const completePasswordResetWithCode = async (email, code, password) => {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE email = $1 AND reset_password_code_hash IS NOT NULL AND reset_password_expires > NOW()',
    args: [String(email).trim().toLowerCase()]
  });
  const user = result.rows[0];
  if (!user) throw new Error('INVALID_CODE');

  if (Number(user.reset_password_attempts || 0) >= MAX_CODE_ATTEMPTS) {
    throw new Error('TOO_MANY_ATTEMPTS');
  }

  const expected = Buffer.from(String(user.reset_password_code_hash));
  const given = Buffer.from(hashResetCode(user.id, String(code).trim()));
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    await db.execute({
      sql: 'UPDATE users SET reset_password_attempts = reset_password_attempts + 1 WHERE id = $1',
      args: [user.id]
    });
    throw new Error(Number(user.reset_password_attempts || 0) + 1 >= MAX_CODE_ATTEMPTS ? 'TOO_MANY_ATTEMPTS' : 'INVALID_CODE');
  }

  return setNewPassword(user.id, password);
};

// Issues a fresh session token for a still-valid one, so the Android app keeps a
// returning user signed in. Role and household come from the database, not the old token.
const refreshSession = async (userId) => {
  const result = await db.execute({
    sql: 'SELECT id, household_id, role FROM users WHERE id = $1',
    args: [userId]
  });
  const user = result.rows[0];
  if (!user) throw new Error('USER_NOT_FOUND');
  return {
    token: createSessionToken({ id: user.id, householdId: user.household_id, role: user.role || 'user' })
  };
};

module.exports = {
  registerUser,
  refreshSession,
  authenticateUser,
  getUserProfile,
  updateProfile,
  initiatePasswordReset,
  completePasswordReset,
  completePasswordResetWithCode,
  createAdminPasswordReset,
  initPasswordResetSchema,
  createSessionToken,
  createGooglePasswordHash
};
