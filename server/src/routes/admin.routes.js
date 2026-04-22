const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

router.get('/users', authenticate, isAdmin, adminController.getUsers);
router.get('/stats', authenticate, isAdmin, adminController.getPlatformStats);
router.post('/kyc/status', authenticate, isAdmin, adminController.updateKycStatus);
router.post('/notifications/broadcast', authenticate, isAdmin, adminController.broadcastNotification);

module.exports = router;
