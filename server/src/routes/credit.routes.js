const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const creditController = require('../controllers/credit.controller');

// Need to configure multer inside the controller or pass it here.
// Let's pass the upload middleware from the controller to the route.

router.post('/apply', authenticate, creditController.uploadMiddleware, creditController.submitApplication);
router.get('/applications', authenticate, creditController.getApplications);
router.post('/disburse/:applicationId', authenticate, creditController.disburseLoan);

module.exports = router;
