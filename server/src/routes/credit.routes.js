const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const creditController = require('../controllers/credit.controller');

// Need to configure multer inside the controller or pass it here.
// Let's pass the upload middleware from the controller to the route.

router.post('/apply', authenticate, creditController.uploadMiddleware, creditController.submitApplication);
router.get('/applications', authenticate, creditController.getApplications);
router.get('/loans', authenticate, creditController.getLoans);
// O Mwanga não empresta: um admin só regista o desembolso feito pelo parceiro licenciado.
router.post('/applications/:applicationId/partner-disbursement', authenticate, isAdmin, creditController.recordPartnerDisbursement);

module.exports = router;
