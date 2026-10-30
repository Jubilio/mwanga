const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');

// O webhook é montado em app.js antes do express.json, porque precisa do corpo cru.
router.post('/checkout', authenticate, paymentController.checkout);
router.get('/:reference', authenticate, paymentController.status);

module.exports = router;
