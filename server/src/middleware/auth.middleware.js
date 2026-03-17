const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('CRITICAL: JWT_SECRET is not defined in environment variables!');
  // In production, we should probably crash or use a very secure fallback
}

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET || 'mwanga-temp-fallback-secret-change-me');
    req.user = decoded;
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

module.exports = { authenticate, isAdmin, JWT_SECRET: JWT_SECRET || 'mwanga-temp-fallback-secret-change-me' };
