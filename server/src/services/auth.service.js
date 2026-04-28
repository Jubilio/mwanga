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

const initiatePasswordReset = async (email) => {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE email = $1',
    args: [email]
  });
  const user = result.rows[0];

  if (!user) {
    return { success: true }; // Security: don't reveal if user exists
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 3600000);

  await db.execute({
    sql: 'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
    args: [token, expires.toISOString(), user.id]
  });

  await emailService.sendPasswordReset(email, token, user.name);
  return { success: true };
};

const completePasswordReset = async (token, password) => {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
    args: [token]
  });
  const user = result.rows[0];

  if (!user) {
    throw new Error('INVALID_TOKEN');
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  await db.execute({
    sql: 'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
    args: [hash, user.id]
  });

  await logAction(user.id, 'RESET_PASSWORD', 'USER', user.id);
  return { success: true };
};

module.exports = {
  registerUser,
  authenticateUser,
  getUserProfile,
  updateProfile,
  initiatePasswordReset,
  completePasswordReset,
  createSessionToken,
  createGooglePasswordHash
};
