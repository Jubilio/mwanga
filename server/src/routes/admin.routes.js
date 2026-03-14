const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const adminController = require('../controllers/admin.controller');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Acesso negado: Requer privilégios de administrador' });
  }
};

router.get('/users', authenticate, isAdmin, adminController.getUsers);
router.get('/stats', authenticate, isAdmin, adminController.getPlatformStats);
router.post('/kyc/status', authenticate, isAdmin, adminController.updateKycStatus);

module.exports = router;
