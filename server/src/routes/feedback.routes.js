const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

// Public to authenticated users
router.post('/', authenticate, feedbackController.uploadMiddleware, feedbackController.submitFeedback);

// Admin only to view feedbacks
router.get('/', authenticate, isAdmin, feedbackController.list);

module.exports = router;
