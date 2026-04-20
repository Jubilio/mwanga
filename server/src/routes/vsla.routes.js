const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const vslaController = require('../controllers/vsla.controller');

router.post('/groups', (req, res, next) => auth.authenticate(req, res, next), vslaController.createGroup);
router.get('/groups', (req, res, next) => auth.authenticate(req, res, next), vslaController.getGroups);
router.get('/groups/:id', (req, res, next) => auth.authenticate(req, res, next), vslaController.getGroupDetails);

module.exports = router;
