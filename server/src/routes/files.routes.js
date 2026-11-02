const express = require('express');
const fs = require('fs');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { db } = require('../config/db');
const { isOwner, resolveFile } = require('../utils/uploads');
const secureFiles = require('../services/secureFiles.service');
const { logAction } = require('../utils/audit');
const logger = require('../utils/logger');

// Documentos de identidade e de crédito: cada leitura fica no audit_log.
const SENSITIVE = ['kyc', 'credit'];

const SECURITY_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
  'X-Content-Type-Options': 'nosniff',
};

// Só o dono do ficheiro ou um admin o podem ler, e sempre com um token válido.
// Os ficheiros novos vêm cifrados da base de dados; os antigos ainda podem
// estar no disco (uploads/), por isso esse caminho continua a ser aceite.
router.get('/:category/:filename', authenticate, async (req, res) => {
  const { category, filename } = req.params;
  const filePath = resolveFile(category, filename);
  if (!filePath) return res.status(404).json({ error: 'Ficheiro não encontrado.' });

  const owner = isOwner(category, filename, req.user.id);
  let allowed = owner;
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
  if (!allowed) return res.status(404).json({ error: 'Ficheiro não encontrado.' });

  let stored = null;
  try {
    stored = await secureFiles.readFile(category, filename);
  } catch (error) {
    logger.error(`Falha ao ler ficheiro cifrado ${category}/${filename}: ${error.message}`);
    return res.status(500).json({ error: 'Não foi possível abrir o ficheiro.' });
  }

  if (!stored && !fs.existsSync(filePath)) return res.status(404).json({ error: 'Ficheiro não encontrado.' });

  if (SENSITIVE.includes(category)) {
    await logAction(req.user.id, owner ? 'FILE_VIEW_OWN' : 'FILE_VIEW_ADMIN', category.toUpperCase(), filename);
  }

  res.set(SECURITY_HEADERS);
  if (stored) {
    res.type(stored.mimeType);
    return res.send(stored.buffer);
  }
  return res.sendFile(filePath);
});

module.exports = router;
