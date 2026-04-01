const { z } = require('zod');
const {
  clearNotifications,
  createNotification,
  deletePushSubscription,
  getPushConfig,
  listNotificationsForUser,
  markNotificationAsRead,
  recordNotificationInteraction,
  removeNotification,
  sendTestNotification,
  upsertPushSubscription,
} = require('../services/notification.service');
const { runUserEngagementSweep } = require('../services/notificationEventEngine.service');
const logger = require('../utils/logger');

const pushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    expirationTime: z.any().nullable().optional(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  deviceType: z.string().min(1).max(30).optional(),
  platform: z.string().min(1).max(30).optional(),
}).strict();

const deleteSubscriptionSchema = z.object({
  endpoint: z.string().url(),
}).strict();

const interactionSchema = z.object({
  notificationId: z.coerce.number().int().positive(),
  interaction: z.enum(['opened', 'actioned']).default('opened'),
  actionId: z.string().max(50).optional(),
}).strict();

const getNotifications = async (req, res) => {
  try {
    try {
      await runUserEngagementSweep({
        userId: req.user.id,
        householdId: req.user.householdId,
        sendPush: false,
      });
    } catch (error) {
      logger.warn(`Notification sweep skipped: ${error.message}`);
    }

    const notifications = await listNotificationsForUser({
      householdId: req.user.householdId,
      userId: req.user.id,
      limit: 50,
    });

    res.json(notifications);
  } catch (error) {
    logger.error(`Notifications fetch failed: ${error.message}`);
    res.status(200).json([]);
  }
};

const markAsRead = async (req, res) => {
  const notification = await markNotificationAsRead({
    notificationId: Number(req.params.id),
    householdId: req.user.householdId,
    userId: req.user.id,
  });

  res.json({ success: Boolean(notification), notification });
};

const clearAll = async (req, res) => {
  await clearNotifications({
    householdId: req.user.householdId,
    userId: req.user.id,
  });

  res.json({ success: true });
};

const deleteNotification = async (req, res) => {
  await removeNotification({
    notificationId: Number(req.params.id),
    householdId: req.user.householdId,
    userId: req.user.id,
  });

  res.json({ success: true });
};

const getPushPublicKey = async (req, res) => {
  res.json(getPushConfig());
};

const savePushSubscription = async (req, res, next) => {
  try {
    const data = pushSubscriptionSchema.parse(req.body);
    const subscription = await upsertPushSubscription({
      householdId: req.user.householdId,
      userId: req.user.id,
      subscription: data.subscription,
      deviceType: data.deviceType || 'pwa',
      platform: data.platform || 'web',
      userAgent: req.headers['user-agent'] || '',
    });

    res.status(201).json(subscription);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues || error.errors });
    }

    next(error);
  }
};

const removePushSubscription = async (req, res, next) => {
  try {
    const data = deleteSubscriptionSchema.parse(req.body);
    await deletePushSubscription({
      householdId: req.user.householdId,
      userId: req.user.id,
      endpoint: data.endpoint,
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues || error.errors });
    }

    next(error);
  }
};

const registerInteraction = async (req, res, next) => {
  try {
    const data = interactionSchema.parse(req.body);
    const notification = await recordNotificationInteraction({
      notificationId: data.notificationId,
      householdId: req.user.householdId,
      userId: req.user.id,
      interaction: data.interaction,
      actionId: data.actionId || null,
    });

    res.json({ success: Boolean(notification), notification });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues || error.errors });
    }

    next(error);
  }
};

const sendTestPush = async (req, res) => {
  const notification = await sendTestNotification({
    householdId: req.user.householdId,
    userId: req.user.id,
  });

  res.status(201).json(notification);
};

module.exports = {
  clearAll,
  createNotification,
  deleteNotification,
  getNotifications,
  getPushPublicKey,
  markAsRead,
  registerInteraction,
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
};
