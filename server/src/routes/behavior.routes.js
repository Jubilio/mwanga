const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { trackBehaviorEvent } = require('../services/behaviorTracking.service');

router.post('/ping', authenticate, async (req, res) => {
  try {
    const { id: userId, householdId } = req.user;
    await trackBehaviorEvent({
      userId,
      householdId,
      eventName: 'app_open',
      eventSource: 'pwa',
    });
    res.json({ status: 'success' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track ping' });
  }
});

module.exports = router;
