/* eslint-env node */
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { db } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('CRITICAL ERROR: JWT_SECRET is not defined in environment variables!');
  process.exit(1);
}

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Token não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Normalização rigorosa de chaves
    req.user.id = Number(req.user.id || req.user.userId || req.user.user_id);
    req.user.householdId = Number(req.user.householdId || req.user.household_id);

    // Validação estrita de Tenancy (Isolamento de Dados)
    if (!req.user.id) {
       logger.error(`Tentativa de acesso com token sem ID de utilizador válido.`);
       return res.status(401).json({ error: 'Unauthorized: Token corrompido ou inválido.' });
    }

    if (!req.user.householdId || isNaN(req.user.householdId)) {
      // Patch de fallback para sessões muito antigas. Em produção estrita, isso deve ser removido.
      try {
        const userResult = await db.execute({
          sql: 'SELECT household_id FROM users WHERE id = ?',
          args: [req.user.id]
        });
        
        if (userResult.rows[0] && userResult.rows[0].household_id) {
          req.user.householdId = Number(userResult.rows[0].household_id);
        } else {
          throw new Error('Household ID não encontrado na base de dados.');
        }
      } catch (dbError) {
        logger.error(`Falha ao recuperar householdId para user ${req.user.id}: ${dbError.message}`);
        return res.status(403).json({ error: 'Acesso Negado: Utilizador não pertence a nenhum agregado familiar.' });
      }
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sessão expirada. Por favor, faça login novamente.' });
    }
    logger.warn(`Tentativa de uso de token inválido: ${error.message}`);
    return res.status(401).json({ error: 'Unauthorized: Token inválido ou expirado.' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    logger.warn(`Tentativa de acesso administrativo não autorizada pelo utilizador: ${req.user?.id}`);
    res.status(403).json({ error: 'Acesso negado: Requer privilégios de administrador.' });
  }
};

module.exports = { authenticate, isAdmin, JWT_SECRET };
