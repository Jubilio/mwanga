const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const secureFiles = require('../services/secureFiles.service');

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

/**
 * Cria um uploader que só aceita os tipos indicados. Os ficheiros ficam em
 * memória só durante o pedido: depois são cifrados e guardados na tabela
 * secure_files (ver services/secureFiles.service.js), nunca em disco.
 * O nome começa sempre pelo id do dono (ou feedback-<id>), que é o que a rota
 * de download usa para verificar quem pode ler.
 *
 * Devolve um objecto com .single(campo) e .fields([...]), como o multer.
 */
const createUploader = (category, allowedTypes, prefix = '') => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) return cb(null, true);
      const error = new Error('Tipo de ficheiro não permitido. Envie JPG, PNG, WEBP ou PDF.');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error);
    },
  });

  const persist = async (req, file) => {
    const suffix = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}`;
    const filename = `${prefix}${req.user.id}-${file.fieldname}-${suffix}${EXTENSIONS[file.mimetype]}`;
    await secureFiles.saveFile({
      filename,
      category,
      userId: req.user.id,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });
    file.filename = filename;
    delete file.buffer; // não manter o documento em claro na memória do pedido
  };

  const withPersistence = (multerMiddleware) => (req, res, next) => {
    multerMiddleware(req, res, async (err) => {
      if (err) return next(err);
      try {
        const files = [];
        if (req.file) files.push(req.file);
        if (req.files) files.push(...(Array.isArray(req.files) ? req.files : Object.values(req.files).flat()));
        for (const file of files) await persist(req, file);
        return next();
      } catch (error) {
        error.code = error.code || 'FILE_STORE_FAILED';
        return next(error);
      }
    });
  };

  return {
    single: (field) => withPersistence(upload.single(field)),
    fields: (spec) => withPersistence(upload.fields(spec)),
  };
};

/** Converte erros do multer numa resposta 400 em vez de 500. */
const handleUploadErrors = (middleware) => (req, res, next) => {
  middleware(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'INVALID_FILE_TYPE') return res.status(400).json({ error: err.message });
    if (err instanceof multer.MulterError) return res.status(400).json({ error: `Upload inválido: ${err.message}` });
    if (err.code === 'FILE_STORE_FAILED') return res.status(503).json({ error: 'Não foi possível guardar o ficheiro. Tente novamente.' });
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
