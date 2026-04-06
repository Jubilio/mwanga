const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/parse', authenticate, smsController.parseSmsMessage);

module.exports = router;
