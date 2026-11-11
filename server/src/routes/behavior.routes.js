const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { z } = require('zod');
const { trackBehaviorEvent } = require('../services/behaviorTracking.service');
const { recordCategorySuggestion } = require('../services/categorySuggestionFeedback');

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

// Whether a category suggestion was kept or corrected (monitoring the model).
router.post('/category-suggestion', authenticate, async (req, res) => {
  try {
    const { id: userId, householdId } = req.user;
    const result = await recordCategorySuggestion({ userId, householdId }, req.body);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed' });
    res.status(500).json({ error: 'Failed to record suggestion feedback' });
  }
});

module.exports = router;
