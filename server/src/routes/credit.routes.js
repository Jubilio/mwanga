const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const creditController = require('../controllers/credit.controller');

// Need to configure multer inside the controller or pass it here.
// Let's pass the upload middleware from the controller to the route.

router.post('/apply', authenticate, creditController.uploadMiddleware, creditController.submitApplication);
router.get('/applications', authenticate, creditController.getApplications);
router.get('/loans', authenticate, creditController.getLoans);
// Disbursing creates a loan for another household, so only admins may do it.
router.post('/disburse/:applicationId', authenticate, isAdmin, creditController.disburseLoan);

module.exports = router;
