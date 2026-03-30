const { db } = require('../config/db');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const scoringService = require('../services/scoring.service');
const loanService = require('../services/loan.service');
const { z } = require('zod');

const submitApplicationSchema = z.object({
  amount: z.string().or(z.number()).transform(v => parseFloat(v)).pipe(z.number().positive().max(3000000)),
  months: z.string().or(z.number()).transform(v => parseInt(v)).pipe(z.number().int().positive().max(120)),
  partner: z.string().min(2).max(100).trim(),
  purpose: z.string().min(2).max(500).trim(),
}).strict();

const disburseLoanSchema = z.object({
  rate: z.string().or(z.number()).transform(v => parseFloat(v)).pipe(z.number().min(0).max(1)),
}).strict();

// Configure Multer for File Uploads
const uploadDir = path.join(__dirname, '../../uploads/credit');
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

const uploadMiddleware = upload.fields([
  { name: 'biDocument', maxCount: 1 },
  { name: 'residenciaDocument', maxCount: 1 },
  { name: 'rendaDocument', maxCount: 1 },
  { name: 'selfieDocument', maxCount: 1 }
]);

const submitApplication = async (req, res, next) => {
  try {
    const { amount, months, partner, purpose } = submitApplicationSchema.parse(req.body);
    const userId = req.user.id;
    const householdId = req.user.householdId;

    // 1. Fetch User Salary for Affordability Check
    const settingsRes = await db.execute({
      sql: 'SELECT value FROM settings WHERE household_id = ? AND key = ?',
      args: [householdId, 'user_salary']
    });
    const salary = parseFloat(settingsRes.rows[0]?.value || 0);

    // 2. Determine Rate based on Partner
    // Official rates: BIM (26.1% AA), BCI (28.1% AA), Micro (10% Month)
    let rate = 0.231; // Default Prime Rate AA
    let isAnnual = true;

    if (partner.toLowerCase().includes('bim')) { rate = 0.261; isAnnual = true; }
    else if (partner.toLowerCase().includes('bci')) { rate = 0.281; isAnnual = true; }
    else if (partner.toLowerCase().includes('micro')) { rate = 0.10; isAnnual = false; }
    else if (partner.toLowerCase().includes('xitique')) { rate = 0; isAnnual = false; }

    // 3. Calculate Installment & Check 1/3 Rule
    const { monthlyPayment } = loanService.calculateLoan(amount, rate, months, isAnnual);
    const maxAllowed = salary / 3;

    if (salary > 0 && monthlyPayment > maxAllowed) {
      return res.status(400).json({ 
        error: 'Capacidade de pagamento excedida', 
        message: `A prestação de MT ${monthlyPayment.toFixed(2)} excede 1/3 do teu salário (MT ${maxAllowed.toFixed(2)}). Aumenta o prazo do empréstimo.` 
      });
    }

    // 4. Calculate Credit Score
    const { score, riskLevel } = await scoringService.calculateScore(userId, householdId);

    // Get file paths if uploaded
    const files = req.files || {};
    const biPath = files['biDocument'] ? files['biDocument'][0].filename : null;
    const residenciaPath = files['residenciaDocument'] ? files['residenciaDocument'][0].filename : null;
    const rendaPath = files['rendaDocument'] ? files['rendaDocument'][0].filename : null;
    const selfiePath = files['selfieDocument'] ? files['selfieDocument'][0].filename : null;

    const result = await db.execute({
      sql: `
        INSERT INTO credit_applications (
          household_id, amount, months, partner, purpose, status, risk_score,
          bi_path, residencia_path, renda_path, selfie_path
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?) RETURNING id
      `,
      args: [
        householdId,
        parseFloat(amount),
        parseInt(months),
        partner,
        purpose,
        score,
        biPath,
        residenciaPath,
        rendaPath,
        selfiePath
      ]
    });

    // 2. Proactively update user score
    await scoringService.updateUserInfo(userId, score);

    logger.info(`Credit application ${result.lastInsertRowid} created for user ${userId} with score ${score}`);
    res.status(201).json({ 
      message: 'Pedido submetido com sucesso', 
      id: Number(result.lastInsertRowid),
      score,
      riskLevel
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error('Error submitting credit application:', error);
    next(error);
  }
};

const getApplications = async (req, res) => {
  try {
    const householdId = req.user.householdId;
    const result = await db.execute({
      sql: 'SELECT * FROM credit_applications WHERE household_id = ? ORDER BY created_at DESC',
      args: [householdId]
    });
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching credit applications:', error);
    res.status(500).json({ error: 'Falha ao buscar pedidos' });
  }
};

const getLoans = async (req, res) => {
  try {
    const householdId = req.user.householdId;
    const result = await db.execute({
      sql: 'SELECT * FROM loans WHERE household_id = ? ORDER BY created_at DESC',
      args: [householdId]
    });
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching loans:', error);
    res.status(500).json({ error: 'Falha ao buscar empréstimos' });
  }
};

const disburseLoan = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { rate } = disburseLoanSchema.parse(req.body); // Monthly rate provided by admin
    
    // 1. Fetch application details
    const appResult = await db.execute({
      sql: 'SELECT * FROM credit_applications WHERE id = ?',
      args: [applicationId]
    });

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const app = appResult.rows[0];
    if (app.status !== 'pending' && app.status !== 'approved') {
      return res.status(400).json({ error: 'Pedido já processado ou em estado inválido' });
    }

    // For now, household_id is used to find the user. 
    // In a real scenario, we'd have a direct app.user_id or fetch from households table.
    // Assuming the first user in the household for now, or fetch from auth.
    const userResult = await db.execute({
      sql: 'SELECT id FROM users WHERE household_id = ? LIMIT 1',
      args: [app.household_id]
    });
    const userId = userResult.rows[0].id;

    // 2. Determine Rate and Calculation Type based on App Partner
    const partner = app.partner || '';
    const isAnnual = !partner.toLowerCase().includes('micro') && !partner.toLowerCase().includes('xitique');

    // 3. Disburse
    const loanId = await loanService.disburseLoan(
      app.id,
      userId,
      app.household_id,
      app.amount,
      parseFloat(rate) || (isAnnual ? 0.231 : 0.10), // Default Prime Rate AA or 10% month
      app.months,
      isAnnual
    );

    res.json({ message: 'Crédito desembolsado com sucesso', loanId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
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
