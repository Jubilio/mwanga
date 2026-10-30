const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');

// O nome do ficheiro final vem do tipo declarado, nunca do nome original,
// para que nada com extensão .html/.svg/.js seja gravado.
const EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_TYPES = [...IMAGE_TYPES, 'application/pdf'];

const CATEGORIES = ['kyc', 'credit', 'feedback'];

const dirFor = (category) => {
  const dir = path.join(UPLOAD_ROOT, category);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

/**
 * Cria um multer que só aceita os tipos indicados e grava os ficheiros em
 * uploads/<category>. O nome começa sempre pelo id do dono (ou feedback-<id>),
 * que é o que a rota de download usa para verificar quem pode ler.
 */
const createUploader = (category, allowedTypes, prefix = '') => {
  const dir = dirFor(category);
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const suffix = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;
      cb(null, `${prefix}${req.user.id}-${file.fieldname}-${suffix}${EXTENSIONS[file.mimetype]}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) return cb(null, true);
      const error = new Error('Tipo de ficheiro não permitido. Envie JPG, PNG, WEBP ou PDF.');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error);
    },
  });
};

/** Converte erros do multer numa resposta 400 em vez de 500. */
const handleUploadErrors = (middleware) => (req, res, next) => {
  middleware(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'INVALID_FILE_TYPE') return res.status(400).json({ error: err.message });
    if (err instanceof multer.MulterError) return res.status(400).json({ error: `Upload inválido: ${err.message}` });
    return next(err);
  });
};

/** Diz se o utilizador é dono do ficheiro, pelo prefixo do nome. */
const isOwner = (category, filename, userId) => {
  const prefix = category === 'feedback' ? `feedback-${userId}-` : `${userId}-`;
  return filename.startsWith(prefix);
};

const resolveFile = (category, filename) => {
  if (!CATEGORIES.includes(category)) return null;
  if (!/^[A-Za-z0-9_-]+(\.[A-Za-z0-9]+)?$/.test(filename)) return null;
  return path.join(UPLOAD_ROOT, category, filename);
};

module.exports = {
  createUploader,
  handleUploadErrors,
  isOwner,
  resolveFile,
  IMAGE_TYPES,
  DOCUMENT_TYPES,
};
