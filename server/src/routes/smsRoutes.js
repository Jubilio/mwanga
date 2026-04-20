const express = require('express');
const router = express.Router();
const smsController = require('../controllers/smsController');
const authMiddleware = require('../middleware/auth.middleware');

// Dynamic handler to avoid circular dependency issues at startup
router.post('/parse', (req, res, next) => {
  // Access authenticate at runtime
  const authenticate = authMiddleware.authenticate;
  if (typeof authenticate !== 'function') {
    return next(new Error('Authentication middleware not ready.'));
  }
  
  authenticate(req, res, () => {
    if (typeof smsController.parseSmsMessage === 'function') {
      return smsController.parseSmsMessage(req, res, next);
    }
    next(new Error('SMS Controller not ready.'));
  });
});

module.exports = router;
