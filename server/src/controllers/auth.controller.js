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

    const transaction = db.transaction(() => {
      // Create household
      const hInfo = db.prepare('INSERT INTO households (name) VALUES (?)').run(householdName || `${name}'s Home`);
      const householdId = hInfo.lastInsertRowid;

      // Hash password
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);

      const uInfo = db.prepare('INSERT INTO users (name, email, password_hash, household_id) VALUES (?, ?, ?, ?)')
                    .run(name, email, hash, householdId);
      
      const userId = uInfo.lastInsertRowid;
      logAction(userId, 'REGISTER', 'USER', userId);
      
      return { id: userId, name, email, householdId };
    });

    const user = transaction();
    const token = jwt.sign({ id: user.id, householdId: user.householdId }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ user, token });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    if (error.message.includes('UNIQUE constraint failed: users.email')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, householdId: user.household_id }, JWT_SECRET, { expiresIn: '7d' });
    const userData = { id: user.id, name: user.name, email: user.email, householdId: user.household_id };
    
    logAction(user.id, 'LOGIN', 'USER', user.id);
    res.json({ user: userData, token });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
};

const getMe = async (req, res) => {
  const user = db.prepare('SELECT id, name, email, household_id as householdId FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
};

const updateProfile = async (req, res) => {
  const { name } = req.body;
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, req.user.id);
  logAction(req.user.id, 'UPDATE_PROFILE', 'USER', req.user.id);
  res.json({ success: true, name });
};

module.exports = { register, login, getMe, updateProfile };
