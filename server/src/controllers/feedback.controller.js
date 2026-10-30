const feedbackService = require('../services/feedback.service');
const logger = require('../utils/logger');
const { createUploader, handleUploadErrors, IMAGE_TYPES } = require('../utils/uploads');

const upload = createUploader('feedback', IMAGE_TYPES, 'feedback-');

const uploadMiddleware = handleUploadErrors(upload.single('screenshot'));

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
