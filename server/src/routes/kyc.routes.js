const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const kycController = require('../controllers/kyc.controller');

router.post('/upload', authenticate, kycController.uploadMiddleware, kycController.uploadDocument);
router.get('/documents', authenticate, kycController.getMyDocuments);

module.exports = router;
