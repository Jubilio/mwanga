const express = require('express');
const router = express.Router();
const webauthnController = require('../controllers/webauthn.controller');
const auth = require('../middleware/auth.middleware');

// Registration (Requires standard login first to bind passkey to user)
router.get('/generate-registration-options', (req, res, next) => auth.authenticate(req, res, next), webauthnController.generateRegistration);
router.post('/verify-registration', (req, res, next) => auth.authenticate(req, res, next), webauthnController.verifyRegistration);

// Authentication (Passwordless Login)
router.post('/generate-authentication-options', webauthnController.generateAuthentication);
router.post('/verify-authentication', webauthnController.verifyAuthentication);

module.exports = router;
