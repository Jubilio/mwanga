const { db } = require('../config/db');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for KYC Uploads
const uploadDir = path.join(__dirname, '../../uploads/kyc');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.id + '-' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
});

const uploadMiddleware = upload.single('document');

const uploadDocument = async (req, res) => {
  try {
    const { documentType } = req.body;
    const userId = req.user.id;

    if (!req.file || !documentType) {
      return res.status(400).json({ error: 'Arquivo ou tipo de documento ausente' });
    }

    const documentUrl = req.file.filename;

    await db.execute({
      sql: `
        INSERT INTO kyc_documents (user_id, document_type, document_url)
        VALUES (?, ?, ?)
      `,
      args: [userId, documentType, documentUrl]
    });

    // Update user kyc_status to 'in_review' if it was 'pending'
    await db.execute({
        sql: "UPDATE users SET kyc_status = 'in_review' WHERE id = ? AND kyc_status = 'pending'",
        args: [userId]
    });

    logger.info(`Document ${documentType} uploaded for user ${userId}`);
    res.status(201).json({ message: 'Documento enviado com sucesso', documentUrl });
  } catch (error) {
    logger.error('Error uploading KYC document:', error);
    res.status(500).json({ error: 'Falha ao enviar documento' });
  }
};

const getMyDocuments = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.execute({
      sql: 'SELECT * FROM kyc_documents WHERE user_id = ? ORDER BY uploaded_at DESC',
      args: [userId]
    });
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching KYC documents:', error);
    res.status(500).json({ error: 'Falha ao buscar documentos' });
  }
};

module.exports = {
  uploadMiddleware,
  uploadDocument,
  getMyDocuments
};
