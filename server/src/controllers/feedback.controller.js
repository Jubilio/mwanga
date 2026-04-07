const feedbackService = require('../services/feedback.service');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/feedback');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `feedback-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadMiddleware = upload.single('screenshot');

const submitFeedback = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    const householdId = req.user.householdId;
    const screenshotUrl = req.file ? `/uploads/feedback/${req.file.filename}` : null;

    if (!message) {
      return res.status(400).json({ status: 'error', message: 'Mensagem e obrigatoria.' });
    }

    const feedback = await feedbackService.createFeedback({
      userId,
      householdId,
      message,
      screenshotUrl
    });

    res.status(201).json({ status: 'success', data: feedback });
  } catch (error) {
    logger.error('Error submitting feedback:', error);
    res.status(500).json({ status: 'error', message: 'Falha ao enviar feedback.' });
  }
};

const list = async (req, res) => {
  try {
    const feedbacks = await feedbackService.listFeedbacks();
    res.json({ status: 'success', data: feedbacks });
  } catch (error) {
    logger.error('Error listing feedbacks:', error);
    res.status(500).json({ status: 'error', message: 'Falha ao listar feedbacks.' });
  }
};

module.exports = {
  uploadMiddleware,
  submitFeedback,
  list
};
