const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

const getPushConfig = (req, res) => {
  try {
    const config = notificationService.getPushConfig();
    res.json(config);
  } catch (error) {
    logger.error(`Error in getPushConfig: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve push configuration.' });
  }
};

const subscribe = async (req, res) => {
  try {
    const { subscription, deviceType, platform, userAgent } = req.body;
    const { householdId, id: userId } = req.user;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ status: 'error', message: 'Invalid subscription object.' });
    }

    const result = await notificationService.upsertPushSubscription({
      householdId: householdId,
      userId,
      subscription,
      deviceType: deviceType || 'pwa',
      platform: platform || 'web',
      userAgent: userAgent || req.get('User-Agent') || '',
    });

    res.status(201).json({ status: 'success', data: result });
  } catch (error) {
    logger.error(`Error in subscribe: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Failed to save push subscription.' });
  }
};

const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body;
    const { householdId, id: userId } = req.user;

    if (!endpoint) {
      return res.status(400).json({ status: 'error', message: 'Endpoint is required for unsubscription.' });
    }

    await notificationService.deletePushSubscription({
      householdId: householdId,
      userId,
      endpoint,
    });

    res.json({ status: 'success', message: 'Push subscription removed.' });
  } catch (error) {
    logger.error(`Error in unsubscribe: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Failed to remove push subscription.' });
  }
};

const list = async (req, res) => {
  try {
    const { householdId, id: userId } = req.user;
    const limit = Number(req.query.limit) || 50;

    const notifications = await notificationService.listNotificationsForUser({
      householdId: householdId,
      userId,
      limit,
    });

    res.json(notifications);
  } catch (error) {
    logger.error(`Error in listNotifications: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Failed to list notifications.' });
  }
};

const markRead = async (req, res) => {
  try {
    const { id: notificationId } = req.params;
    const { householdId, id: userId } = req.user;

    const notification = await notificationService.markNotificationAsRead({
      notificationId: Number(notificationId),
      householdId: householdId,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ status: 'error', message: 'Notification not found or access denied.' });
    }

    res.json({ status: 'success', data: notification });
  } catch (error) {
    logger.error(`Error in markRead: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Failed to mark notification as read.' });
  }
};

const clearAll = async (req, res) => {
  try {
    const { householdId, id: userId } = req.user;

    await notificationService.clearNotifications({
      householdId: householdId,
      userId,
    });

    res.json({ status: 'success', message: 'All notifications cleared.' });
  } catch (error) {
    logger.error(`Error in clearNotifications: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Failed to clear notifications.' });
  }
};

const deleteOne = async (req, res) => {
  try {
    const { id: notificationId } = req.params;
    const { householdId, id: userId } = req.user;

    await notificationService.removeNotification({
      notificationId: Number(notificationId),
      householdId: householdId,
      userId,
    });

    res.json({ status: 'success', message: 'Notification removed.' });
  } catch (error) {
    logger.error(`Error in removeNotification: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Failed to remove notification.' });
  }
};

const recordInteraction = async (req, res) => {
  try {
    const { notificationId, interaction, actionId } = req.body;
    const { householdId, id: userId } = req.user;

    const result = await notificationService.recordNotificationInteraction({
      notificationId: Number(notificationId),
      householdId: householdId,
      userId,
      interaction,
      actionId,
    });

    res.json({ status: 'success', data: result });
  } catch (error) {
    logger.error(`Error in recordInteraction: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Failed to record interaction.' });
  }
};

const sendTest = async (req, res) => {
  try {
    const { householdId, id: userId } = req.user;

    const notification = await notificationService.sendTestNotification({
      householdId: householdId,
      userId,
    });

    res.status(201).json({ status: 'success', data: notification });
  } catch (error) {
    logger.error(`Error in sendTestNotification: ${error.message}`);
    res.status(500).json({ status: 'error', message: 'Failed to send test push.' });
  }
};

module.exports = {
  getPushConfig,
  subscribe,
  unsubscribe,
  list,
  markRead,
  clearAll,
  deleteOne,
  recordInteraction,
  sendTest,
};
