const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.get('/push-config', notificationController.getPushConfig);

// Private routes (requires authentication)
router.use(authenticate);

router.get('/', notificationController.list);
router.post('/subscribe', notificationController.subscribe);
router.post('/unsubscribe', notificationController.unsubscribe);
router.post('/push-subscriptions', notificationController.subscribe); // Alias for frontend compatibility
router.delete('/push-subscriptions', notificationController.unsubscribe); // RESTful unsubscription

// Reserved literal paths should be defined BEFORE parameterized routes to ensure they match first.
// However, the router package and Express 5 are very strict with regex parameters.
// We'll use simple :id parameters and rely on our hardened controller logic.

router.put('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.deleteOne);
router.delete('/', notificationController.clearAll);
router.post('/interactions', notificationController.recordInteraction);
router.post('/test', notificationController.sendTest);

module.exports = router;
