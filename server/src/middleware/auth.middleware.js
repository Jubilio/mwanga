/* eslint-env node */
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { db } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('CRITICAL ERROR: JWT_SECRET is not defined in environment variables!');
  process.exit(1); // Stop server immediately if secret is missing for safety
}

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Unify key naming (handle both underscore and camelCase)
    req.user.id = req.user.id || req.user.userId || req.user.user_id;
    req.user.householdId = req.user.householdId || req.user.household_id;

    // Backward compatibility patch: if token is old and lacks householdId altogether, fetch it from DB
    if (!req.user.householdId && req.user.id) {
      try {
        const userResult = await db.execute({
          sql: 'SELECT household_id FROM users WHERE id = ?',
          args: [req.user.id]
        });
        if (userResult.rows[0]) {
          req.user.householdId = userResult.rows[0].household_id || userResult.rows[0].householdId;
        }
      } catch (dbError) {
        logger.error(`Failed to fetch fallback householdId for user ${req.user.id}: ${dbError.message}`);
        // Continue anyway, controllers will handle missing ID gracefully
      }
    }

    next();
  } catch (error) {
    logger.warn(`Invalid token attempt: ${error.message}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    logger.warn(`Unauthorized admin access attempt by user: ${req.user?.id}`);
    res.status(403).json({ error: 'Acesso negado: Requer privilégios de administrador' });
  }
};

module.exports = { authenticate, isAdmin, JWT_SECRET };
