const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');
const adminEmail = require('../controllers/adminEmail.controller');

router.get('/users', authenticate, isAdmin, adminController.getUsers);
router.get('/stats', authenticate, isAdmin, adminController.getPlatformStats);
router.get('/credit-applications', authenticate, isAdmin, adminController.getCreditApplications);
router.post('/kyc/status', authenticate, isAdmin, adminController.updateKycStatus);
router.post('/notifications/broadcast', authenticate, isAdmin, adminController.broadcastNotification);

router.get('/emails/status', authenticate, isAdmin, adminEmail.getStatus);
router.post('/emails/test', authenticate, isAdmin, adminEmail.sendTest);
router.get('/emails/campaigns', authenticate, isAdmin, adminEmail.listCampaigns);
router.post('/emails/campaigns', authenticate, isAdmin, adminEmail.createCampaign);
router.post('/emails/campaigns/:id/cancel', authenticate, isAdmin, adminEmail.cancelCampaign);

module.exports = router;
