const { db } = require('../config/db');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

const submitApplication = async (req, res) => {
  try {
    const { amount, months, partner, purpose } = req.body;
    const householdId = req.user.household_id;

    if (!amount || !months || !partner || !purpose) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get file paths if uploaded
    const files = req.files || {};
    const biPath = files['biDocument'] ? files['biDocument'][0].filename : null;
    const residenciaPath = files['residenciaDocument'] ? files['residenciaDocument'][0].filename : null;
    const rendaPath = files['rendaDocument'] ? files['rendaDocument'][0].filename : null;
    const selfiePath = files['selfieDocument'] ? files['selfieDocument'][0].filename : null;

    const stmt = db.prepare(`
      INSERT INTO credit_applications (
        household_id, amount, months, partner, purpose, status,
        bi_path, residencia_path, renda_path, selfie_path
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `);

    const result = stmt.run(
      householdId,
      parseFloat(amount),
      parseInt(months),
      partner,
      purpose,
      biPath,
      residenciaPath,
      rendaPath,
      selfiePath
    );

    logger.info(`Credit application ${result.lastInsertRowid} created for household ${householdId}`);
    res.status(201).json({ message: 'Application submitted successfully', id: result.lastInsertRowid });
  } catch (error) {
    logger.error('Error submitting credit application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
};

const getApplications = async (req, res) => {
  try {
    const householdId = req.user.household_id;
    const applications = db.prepare('SELECT * FROM credit_applications WHERE household_id = ? ORDER BY created_at DESC').all(householdId);
    res.json(applications);
  } catch (error) {
    logger.error('Error fetching credit applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

module.exports = {
  uploadMiddleware,
  submitApplication,
  getApplications
};
