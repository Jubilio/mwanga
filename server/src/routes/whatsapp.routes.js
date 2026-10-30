const express = require('express');
const router = express.Router();
const whatsAppController = require('../controllers/whatsapp.controller');
const { verifyWhatsAppWebhook } = require('../middleware/whatsappWebhook.middleware');

// Webhook endpoints
router.post('/webhook', verifyWhatsAppWebhook, whatsAppController.webhook);
router.get('/webhook', whatsAppController.verify);

// Health check
router.get('/status', whatsAppController.verify);

module.exports = router;
