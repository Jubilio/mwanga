const crypto = require('crypto');
const { db } = require('../config/db');
const logger = require('../utils/logger');

// Documentos enviados (BI, selfie, comprovativos, capturas de ecrã) são
// cifrados com AES-256-GCM e guardados na base de dados, não no disco do
// servidor. O disco do Render apaga-se a cada deploy, e um ficheiro em claro
// no disco fica legível para quem tiver acesso à máquina.

const VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;

let cachedKey = null;
let warnedFallback = false;

function parseKey(raw) {
  const value = raw.trim();
  const buffer = /^[0-9a-fA-F]{64}$/.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  if (buffer.length !== 32) throw new Error('FILE_ENCRYPTION_KEY tem de ter 32 bytes (64 caracteres hex ou base64).');
  return buffer;
}

function encryptionKey() {
  if (cachedKey) return cachedKey;
  if (process.env.FILE_ENCRYPTION_KEY) {
    cachedKey = parseKey(process.env.FILE_ENCRYPTION_KEY);
    return cachedKey;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('FILE_ENCRYPTION_KEY e JWT_SECRET em falta: não é possível cifrar ficheiros.');
  if (!warnedFallback) {
    logger.warn('FILE_ENCRYPTION_KEY em falta: a chave dos ficheiros é derivada do JWT_SECRET. Defina FILE_ENCRYPTION_KEY antes de mudar o JWT_SECRET.');
    warnedFallback = true;
  }
  cachedKey = Buffer.from(crypto.hkdfSync('sha256', secret, 'mwanga-files', 'mwanga-files-v1', 32));
  return cachedKey;
}

/** Formato: [versão 1 byte][iv 12][tag 16][conteúdo cifrado]. */
function encrypt(plain, key = encryptionKey()) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), body]);
}

function decrypt(sealed, key = encryptionKey()) {
  const data = Buffer.isBuffer(sealed) ? sealed : Buffer.from(sealed);
  if (data[0] !== VERSION) throw new Error('Formato de ficheiro cifrado desconhecido.');
  const iv = data.subarray(1, 1 + IV_BYTES);
  const tag = data.subarray(1 + IV_BYTES, 1 + IV_BYTES + TAG_BYTES);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data.subarray(1 + IV_BYTES + TAG_BYTES)), decipher.final()]);
}

async function initSecureFilesSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS secure_files (
      filename TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      user_id INTEGER,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      content BYTEA NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    'CREATE INDEX IF NOT EXISTS idx_secure_files_user ON secure_files (user_id)',
    // Sem políticas: a API pública do Supabase não lê esta tabela; só o backend.
    'ALTER TABLE secure_files ENABLE ROW LEVEL SECURITY',
  ];
  try {
    for (const sql of statements) await db.execute({ sql, args: [] });
    logger.info('secure_files table initialized or already exists.');
  } catch (error) {
    logger.warn(`Failed to initialize secure_files table: ${error.message}`);
  }
}

async function saveFile({ filename, category, userId, mimeType, buffer }) {
  await db.execute({
    sql: `INSERT INTO secure_files (filename, category, user_id, mime_type, size_bytes, content)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [filename, category, userId, mimeType, buffer.length, encrypt(buffer)],
  });
}

/** Devolve { mimeType, buffer } ou null se o ficheiro não estiver na base de dados. */
async function readFile(category, filename) {
  const result = await db.execute({
    sql: 'SELECT mime_type, content FROM secure_files WHERE category = ? AND filename = ?',
    args: [category, filename],
  });
  const row = result.rows[0];
  if (!row) return null;
  return { mimeType: row.mime_type, buffer: decrypt(row.content) };
}

/** Apaga ficheiros guardados num pedido que acabou por falhar. */
async function deleteFiles(filenames = []) {
  const names = filenames.filter(Boolean);
  if (!names.length) return;
  try {
    await db.execute({ sql: 'DELETE FROM secure_files WHERE filename = ANY(?::text[])', args: [names] });
  } catch (error) {
    logger.warn(`Ficheiros órfãos não apagados (${names.length}): ${error.message}`);
  }
}

/** Nomes dos ficheiros que o uploader guardou neste pedido. */
function uploadedFilenames(req) {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files) files.push(...(Array.isArray(req.files) ? req.files : Object.values(req.files).flat()));
  return files.map((file) => file.filename).filter(Boolean);
}

function resetKeyCacheForTests() {
  cachedKey = null;
  warnedFallback = false;
}

module.exports = {
  encrypt,
  decrypt,
  encryptionKey,
  initSecureFilesSchema,
  saveFile,
  readFile,
  deleteFiles,
  uploadedFilenames,
  resetKeyCacheForTests,
};
