const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const vslaController = require('../controllers/vsla.controller');

router.post('/groups', authenticate, vslaController.createGroup);
router.get('/groups', authenticate, vslaController.getGroups);
router.get('/groups/:id', authenticate, vslaController.getGroupDetails);

module.exports = router;
