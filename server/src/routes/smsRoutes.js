const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');
const { authenticate } = require('../middleware/auth.middleware');

// Defensive check to avoid TypeError if exports are still being populated
router.post('/parse', authenticate, (req, res, next) => {
  if (typeof smsController.parseSmsMessage === 'function') {
    return smsController.parseSmsMessage(req, res, next);
  }
  next(new Error('SMS Controller is not fully initialized.'));
});

module.exports = router;
