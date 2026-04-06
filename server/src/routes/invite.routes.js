const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/invite.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/generate', authenticate, inviteController.generateInvite);
router.get('/members', authenticate, inviteController.getFamilyMembers);

module.exports = router;
