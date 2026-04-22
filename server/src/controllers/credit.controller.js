const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const creditService = require('../services/credit.service');
const { submitApplicationSchema, disburseLoanSchema } = require('../schemas/credit.schema');

// Configure Multer for File Uploads
const uploadDir = path.join(__dirname, '../../uploads/credit');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, req.user.id + '-' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadMiddleware = upload.fields([
  { name: 'biDocument', maxCount: 1 },
  { name: 'residenciaDocument', maxCount: 1 },
  { name: 'rendaDocument', maxCount: 1 },
  { name: 'selfieDocument', maxCount: 1 }
]);

const submitApplication = async (req, res, next) => {
  try {
    const data = submitApplicationSchema.parse(req.body);
    const result = await creditService.submitApplication(req.user.id, req.user.householdId, data, req.files || {});
    
    res.status(201).json({ 
      message: 'Pedido submetido com sucesso', 
      ...result
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    if (error.message === 'AFFORDABILITY_EXCEEDED') {
      return res.status(400).json({ 
        error: 'Capacidade de pagamento excedida', 
        message: 'A prestação excede 1/3 do teu salário. Aumenta o prazo do empréstimo.' 
      });
    }
    logger.error('Error submitting credit application:', error);
    next(error);
  }
};

const getApplications = async (req, res) => {
  try {
    const rows = await creditService.getApplications(req.user.householdId);
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching credit applications:', error);
    res.status(500).json({ error: 'Falha ao buscar pedidos' });
  }
};

const getLoans = async (req, res) => {
  try {
    const rows = await creditService.getLoans(req.user.householdId);
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching loans:', error);
    res.status(500).json({ error: 'Falha ao buscar empréstimos' });
  }
};

const disburseLoan = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { rate } = disburseLoanSchema.parse(req.body);
    
    const loanId = await creditService.disburseLoan(applicationId, rate);
    res.json({ message: 'Crédito desembolsado com sucesso', loanId });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Pedido não encontrado' });
    if (error.message === 'INVALID_STATUS') return res.status(400).json({ error: 'Pedido já processado ou em estado inválido' });
    
    logger.error('Error disbursing loan:', error);
    next(error);
  }
};

module.exports = {
  uploadMiddleware,
  submitApplication,
  getApplications,
  getLoans,
  disburseLoan
};
