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
router.put('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.deleteOne);
router.delete('/', notificationController.clearAll);
router.post('/interactions', notificationController.recordInteraction);
router.post('/test', notificationController.sendTest);

module.exports = router;
