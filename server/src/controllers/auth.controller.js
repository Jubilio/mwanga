const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { logAction } = require('../utils/audit');
const { JWT_SECRET } = require('../middleware/auth.middleware');
const { z } = require('zod');

// Validation Schemas
const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  householdName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const register = async (req, res, next) => {
  try {
    const { name, email, password, householdName } = registerSchema.parse(req.body);

    // Create household
    const hInfo = await db.execute({
      sql: 'INSERT INTO households (name) VALUES (?) RETURNING id',
      args: [householdName || `${name}'s Home`]
    });
    const householdId = Number(hInfo.lastInsertRowid);

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const uInfo = await db.execute({
      sql: 'INSERT INTO users (name, email, password_hash, household_id) VALUES (?, ?, ?, ?) RETURNING id',
      args: [name, email, hash, householdId]
    });
    
    const userId = Number(uInfo.lastInsertRowid);
    await logAction(userId, 'REGISTER', 'USER', userId);
    
    const userRole = 'user'; // Default for new users
    const user = { id: userId, name, email, householdId, role: userRole };
    const token = jwt.sign({ id: user.id, householdId: user.householdId, role: userRole }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ user, token });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
      return res.status(400).json({ error: 'Email já existe' });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE email = ?',
      args: [email]
    });
    const user = result.rows[0];
    const userRole = user?.role || 'user'; // Fallback if column missing or null

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ id: user.id, householdId: user.household_id, role: userRole }, JWT_SECRET, { expiresIn: '7d' });
    const userData = { id: user.id, name: user.name, email: user.email, householdId: user.household_id, role: userRole };
    
    await logAction(user.id, 'LOGIN', 'USER', user.id);
    res.json({ user: userData, token });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
};

const getMe = async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [req.user.id]
  });
  const user = result.rows[0];
  if (user) {
    const { password_hash, household_id, ...data } = user;
    res.json({ ...data, householdId: household_id, role: user.role || 'user' });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
};

const updateProfile = async (req, res) => {
  const { name } = req.body;
  await db.execute({
    sql: 'UPDATE users SET name = ? WHERE id = ?',
    args: [name, req.user.id]
  });
  await logAction(req.user.id, 'UPDATE_PROFILE', 'USER', req.user.id);
  res.json({ success: true, name });
};

module.exports = { register, login, getMe, updateProfile };
