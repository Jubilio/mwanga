const express = require('express');
const fs = require('fs');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { db } = require('../config/db');
const { isOwner, resolveFile } = require('../utils/uploads');
const logger = require('../utils/logger');

// Substitui o antigo express.static('/uploads'): só o dono do ficheiro ou um
// admin o podem ler, e sempre com um token válido.
router.get('/:category/:filename', authenticate, async (req, res) => {
  const { category, filename } = req.params;
  const filePath = resolveFile(category, filename);
  if (!filePath) return res.status(404).json({ error: 'Ficheiro não encontrado.' });

  let allowed = isOwner(category, filename, req.user.id);
  if (!allowed) {
    try {
      const result = await db.execute({ sql: 'SELECT role FROM users WHERE id = ?', args: [req.user.id] });
      allowed = result.rows[0]?.role === 'admin';
    } catch (error) {
      logger.error(`Falha ao verificar acesso ao ficheiro ${category}/${filename}: ${error.message}`);
      return res.status(500).json({ error: 'Não foi possível verificar permissões.' });
    }
  }

  // 404 em vez de 403 para não confirmar que o ficheiro existe.
  if (!allowed || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Ficheiro não encontrado.' });

  res.set({
    'Cache-Control': 'private, no-store',
    'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    'X-Content-Type-Options': 'nosniff',
  });
  return res.sendFile(filePath);
});

module.exports = router;
