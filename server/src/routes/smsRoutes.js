const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');
const { authenticate } = require('../middleware/auth.middleware');

// Protect the route so only authenticated users with a household can map it
router.post('/parse', authenticate, smsController.parseSmsMessage);

module.exports = router;
