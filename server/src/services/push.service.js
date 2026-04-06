const webpush = require('web-push');
const { db } = require('../config/db');
const logger = require('../utils/logger');
const { getNotificationSchema } = require('./notificationSchema.service');

function getVapidKeys() {
  return {
    subject: process.env.VAPID_SUBJECT || 'mailto:support@mwanga.app',
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
  };
}

let vapidConfigured = false;

function hasPushCredentials() {
  const { publicKey, privateKey } = getVapidKeys();
  return Boolean(publicKey && privateKey);
}

function configureVapid() {
  if (vapidConfigured || !hasPushCredentials()) {
    return vapidConfigured;
  }

  const { subject, publicKey, privateKey } = getVapidKeys();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function buildActions(actionPayload = {}) {
  if (Array.isArray(actionPayload.actions) && actionPayload.actions.length > 0) {
    return actionPayload.actions.slice(0, 2).map((item) => ({
      action: item.action,
      title: item.title,
    }));
  }

  if (actionPayload.action === 'OPEN_DAILY_LOG') {
    return [
      { action: 'ADD_EXPENSE', title: 'Despesa' },
      { action: 'ADD_INCOME', title: 'Receita' },
    ];
  }

  return [{ action: 'OPEN', title: 'Abrir Mwanga' }];
}

function buildPushPayload(notification) {
  const actionPayload = notification.action_payload || notification.actionPayload || {};

  return JSON.stringify({
    title: notification.title || 'Mwanga',
    body: notification.message,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: notification.dedupe_key || notification.dedupeKey || `${notification.type}-${notification.id}`,
    renotify: notification.type === 'warning',
    requireInteraction: notification.type === 'warning',
    actions: buildActions(actionPayload),
    data: {
      ...actionPayload,
      notificationId: notification.id,
      type: notification.type,
      route: actionPayload.route || '/quick-add',
      date: actionPayload.date,
      title: notification.title,
    },
  });
}

async function updateNotificationStatus(notificationId, nextStatus, delivered = 0) {
  if (!notificationId) {
    return;
  }

  const schema = await getNotificationSchema();
  if (!schema.hasNotificationColumn('status')) {
    return;
  }

  const hasSentAt = schema.hasNotificationColumn('sent_at');
  const hasDeliveredAt = schema.hasNotificationColumn('delivered_at');

  let sql = 'UPDATE notifications SET status = ?';
  const args = [nextStatus];

  if (hasSentAt) {
    sql += ', sent_at = COALESCE(sent_at, NOW())';
  }
  if (hasDeliveredAt) {
    sql += ', delivered_at = CASE WHEN ? > 0 THEN COALESCE(delivered_at, NOW()) ELSE delivered_at END';
    args.push(delivered);
  }

  sql += ' WHERE id = ?';
  args.push(notificationId);

  await db.execute({ sql, args });
}

async function deactivateSubscription(subscriptionId, errorMessage) {
  await db.execute({
    sql: `
      UPDATE push_subscriptions
      SET
        is_active = FALSE,
        last_error = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    args: [errorMessage || 'inactive', subscriptionId],
  });
}

async function registerPushDeliveryFailure(subscriptionId, errorMessage) {
  await db.execute({
    sql: `
      UPDATE push_subscriptions
      SET
        failure_count = COALESCE(failure_count, 0) + 1,
        last_error = ?,
        updated_at = NOW()
      WHERE id = ?
    `,
    args: [errorMessage || 'delivery_failed', subscriptionId],
  });
}

async function markPushDeliverySuccess(subscriptionId) {
  await db.execute({
    sql: `
      UPDATE push_subscriptions
      SET
        failure_count = 0,
        last_error = NULL,
        last_seen_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `,
    args: [subscriptionId],
  });
}

async function sendPushNotification(notification) {
  const schema = await getNotificationSchema();
  if (!schema.hasPushSubscriptionsTable) {
    logger.warn('Push skipped: push_subscriptions table does not exist. Run the notification migration.');
    await updateNotificationStatus(notification?.id, 'stored', 0);
    return { attempted: 0, delivered: 0, skipped: true };
  }

  if (!notification?.user_id) {
    logger.warn(`Push skipped: notification has no user_id (notification.id=${notification?.id}).`);
    await updateNotificationStatus(notification?.id, 'stored', 0);
    return { attempted: 0, delivered: 0, skipped: true };
  }

  if (!hasPushCredentials()) {
    logger.warn('Push skipped: VAPID keys are not configured in .env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).');
    await updateNotificationStatus(notification?.id, 'stored', 0);
    return { attempted: 0, delivered: 0, skipped: true };
  }

  configureVapid();

  const result = await db.execute({
    sql: `
      SELECT *
      FROM push_subscriptions
      WHERE user_id = ?
        AND household_id = ?
        AND is_active = TRUE
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
    `,
    args: [notification.user_id, notification.household_id],
  });

  const subscriptions = result.rows || [];
  if (subscriptions.length === 0) {
    logger.warn(`Push skipped: no active subscriptions for user_id=${notification.user_id}, household_id=${notification.household_id}.`);
    await updateNotificationStatus(notification?.id, 'stored', 0);
    return { attempted: 0, delivered: 0, skipped: true };
  }

  logger.info(`Push: attempting delivery to ${subscriptions.length} subscription(s) for user_id=${notification.user_id}...`);

  const payload = buildPushPayload(notification);
  let delivered = 0;

  for (const subscription of subscriptions) {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expiration_time,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, payload, {
        TTL: notification.type === 'warning' ? 120 : 3600,
        urgency: notification.type === 'warning' ? 'high' : 'normal',
      });

      delivered += 1;
      await markPushDeliverySuccess(subscription.id);
    } catch (error) {
      const statusCode = error.statusCode || error.status_code;
      const message = error.body || error.message || 'push_failed';

      if (statusCode === 404 || statusCode === 410) {
        await deactivateSubscription(subscription.id, message);
      } else {
        await registerPushDeliveryFailure(subscription.id, message);
      }

      logger.warn(`Push delivery failed for subscription ${subscription.id}: ${message}`);
    }
  }

  await updateNotificationStatus(notification?.id, delivered > 0 ? 'sent' : 'stored', delivered);
  return { attempted: subscriptions.length, delivered };
}

module.exports = {
  buildPushPayload,
  hasPushCredentials,
  sendPushNotification,
  getVapidKeys,
};
