const { db } = require('../config/db');
const logger = require('../utils/logger');
const { sendPushNotification, VAPID_PUBLIC_KEY, hasPushCredentials } = require('./push.service');
const { trackBehaviorEvent } = require('./behaviorTracking.service');
const { getNotificationSchema } = require('./notificationSchema.service');

function buildDefaultTitle(type) {
  const titles = {
    motivation: 'Bom momentum financeiro',
    reminder: 'Pequeno lembrete do Mwanga',
    warning: 'Alerta financeiro',
    success: 'Bom progresso financeiro',
    info: 'Atualizacao do Mwanga',
  };

  return titles[type] || 'Mwanga';
}

function normalizeLegacyNotificationArgs(input, legacyType, legacyMessage) {
  if (typeof input === 'object' && input !== null) {
    return {
      householdId: input.householdId,
      userId: input.userId || null,
      title: input.title || buildDefaultTitle(input.type),
      message: input.message,
      type: input.type || 'reminder',
      channel: input.channel || 'push',
      tone: input.tone || 'friendly',
      actionPayload: input.actionPayload || {},
      metadata: input.metadata || {},
      dedupeKey: input.dedupeKey || null,
      sendPush: input.sendPush !== false,
      sentAt: input.sentAt || new Date().toISOString(),
    };
  }

  return {
    householdId: input,
    userId: null,
    title: buildDefaultTitle(legacyType),
    message: legacyMessage,
    type: legacyType || 'reminder',
    channel: 'in_app',
    tone: 'friendly',
    actionPayload: {},
    metadata: {},
    dedupeKey: null,
    sendPush: false,
    sentAt: new Date().toISOString(),
  };
}

function buildLegacyNotificationRecord(notificationInput, row = {}) {
  return {
    id: row.id || null,
    household_id: notificationInput.householdId,
    user_id: row.user_id || notificationInput.userId || null,
    title: row.title || notificationInput.title,
    message: row.message || notificationInput.message,
    type: row.type || notificationInput.type,
    channel: row.channel || notificationInput.channel,
    tone: row.tone || notificationInput.tone,
    action_payload: row.action_payload || notificationInput.actionPayload || {},
    metadata: row.metadata || notificationInput.metadata || {},
    dedupe_key: row.dedupe_key || notificationInput.dedupeKey || null,
    status: row.status || (notificationInput.sendPush ? 'queued' : 'stored'),
    read: row.read ?? 0,
    sent_at: row.sent_at || notificationInput.sentAt,
    created_at: row.created_at || new Date().toISOString(),
  };
}

function createUnsupportedFeatureError(message) {
  const error = new Error(message);
  error.statusCode = 409;
  error.code = 'NOTIFICATION_SCHEMA_UNSUPPORTED';
  return error;
}

async function createNotification(input, legacyType, legacyMessage) {
  const notificationInput = normalizeLegacyNotificationArgs(input, legacyType, legacyMessage);
  const schema = await getNotificationSchema();

  const hasRichNotificationSchema =
    schema.hasNotificationColumn('user_id') &&
    schema.hasNotificationColumn('title') &&
    schema.hasNotificationColumn('action_payload') &&
    schema.hasNotificationColumn('metadata') &&
    schema.hasNotificationColumn('status');

  let notification;

  if (!hasRichNotificationSchema) {
    const result = await db.execute({
      sql: `
        INSERT INTO notifications (
          household_id,
          type,
          message
        )
        VALUES (?, ?, ?)
        RETURNING *
      `,
      args: [
        notificationInput.householdId,
        notificationInput.type,
        notificationInput.message,
      ],
    });

    notification = buildLegacyNotificationRecord(notificationInput, result.rows[0] || {});
    return notification;
  }

  let result;
  if (notificationInput.dedupeKey) {
    result = await db.execute({
      sql: `
        INSERT INTO notifications (
          household_id,
          user_id,
          title,
          message,
          type,
          channel,
          tone,
          action_payload,
          metadata,
          dedupe_key,
          status,
          read,
          sent_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, 0, ?)
        ON CONFLICT (user_id, dedupe_key) DO NOTHING
        RETURNING *
      `,
      args: [
        notificationInput.householdId,
        notificationInput.userId,
        notificationInput.title,
        notificationInput.message,
        notificationInput.type,
        notificationInput.channel,
        notificationInput.tone,
        JSON.stringify(notificationInput.actionPayload || {}),
        JSON.stringify(notificationInput.metadata || {}),
        notificationInput.dedupeKey,
        notificationInput.sendPush ? 'queued' : 'stored',
        notificationInput.sentAt,
      ],
    });
  } else {
    result = await db.execute({
      sql: `
        INSERT INTO notifications (
          household_id,
          user_id,
          title,
          message,
          type,
          channel,
          tone,
          action_payload,
          metadata,
          status,
          read,
          sent_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, 0, ?)
        RETURNING *
      `,
      args: [
        notificationInput.householdId,
        notificationInput.userId,
        notificationInput.title,
        notificationInput.message,
        notificationInput.type,
        notificationInput.channel,
        notificationInput.tone,
        JSON.stringify(notificationInput.actionPayload || {}),
        JSON.stringify(notificationInput.metadata || {}),
        notificationInput.sendPush ? 'queued' : 'stored',
        notificationInput.sentAt,
      ],
    });
  }

  notification = result.rows[0];
  if (!notification) {
    return { deduped: true };
  }

  await trackBehaviorEvent({
    userId: notification.user_id,
    householdId: notification.household_id,
    eventName: 'notification_created',
    eventSource: 'notification',
    context: {
      notificationId: notification.id,
      type: notification.type,
      dedupeKey: notification.dedupe_key,
    },
  });

  if (notificationInput.sendPush) {
    try {
      await sendPushNotification(notification);
    } catch (error) {
      logger.warn(`Push dispatch failed after notification insert: ${error.message}`);
    }
  }

  return notification;
}

async function listNotificationsForUser({ householdId, userId, limit = 50 }) {
  const schema = await getNotificationSchema();
  const hasUserScope = schema.hasNotificationColumn('user_id');

  const result = await db.execute({
    sql: hasUserScope
      ? `
          SELECT *
          FROM notifications
          WHERE household_id = ?
            AND (user_id = ? OR user_id IS NULL)
          ORDER BY created_at DESC
          LIMIT ?
        `
      : `
          SELECT *
          FROM notifications
          WHERE household_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `,
    args: hasUserScope ? [householdId, userId, limit] : [householdId, limit],
  });

  return (result.rows || []).map((row) => buildLegacyNotificationRecord({
    householdId,
    userId,
    title: row.title || buildDefaultTitle(row.type),
    message: row.message,
    type: row.type,
    channel: row.channel || 'in_app',
    tone: row.tone || 'friendly',
    actionPayload: row.action_payload || {},
    metadata: row.metadata || {},
    dedupeKey: row.dedupe_key || null,
    sendPush: false,
    sentAt: row.sent_at || row.created_at,
  }, row));
}

async function markNotificationAsRead({ notificationId, householdId, userId }) {
  const schema = await getNotificationSchema();
  const hasUserScope = schema.hasNotificationColumn('user_id');
  const hasOpenedAt = schema.hasNotificationColumn('opened_at');

  const result = await db.execute({
    sql: hasUserScope
      ? `
          UPDATE notifications
          SET
            read = 1
            ${hasOpenedAt ? ', opened_at = COALESCE(opened_at, NOW())' : ''}
          WHERE id = ?
            AND household_id = ?
            AND (user_id = ? OR user_id IS NULL)
          RETURNING *
        `
      : `
          UPDATE notifications
          SET
            read = 1
          WHERE id = ?
            AND household_id = ?
          RETURNING *
        `,
    args: hasUserScope ? [notificationId, householdId, userId] : [notificationId, householdId],
  });

  return result.rows[0] || null;
}

async function clearNotifications({ householdId, userId }) {
  const schema = await getNotificationSchema();
  const hasUserScope = schema.hasNotificationColumn('user_id');

  await db.execute({
    sql: hasUserScope
      ? `
          DELETE FROM notifications
          WHERE household_id = ?
            AND (user_id = ? OR user_id IS NULL)
        `
      : `
          DELETE FROM notifications
          WHERE household_id = ?
        `,
    args: hasUserScope ? [householdId, userId] : [householdId],
  });
}

async function removeNotification({ notificationId, householdId, userId }) {
  const schema = await getNotificationSchema();
  const hasUserScope = schema.hasNotificationColumn('user_id');

  await db.execute({
    sql: hasUserScope
      ? `
          DELETE FROM notifications
          WHERE id = ?
            AND household_id = ?
            AND (user_id = ? OR user_id IS NULL)
        `
      : `
          DELETE FROM notifications
          WHERE id = ?
            AND household_id = ?
        `,
    args: hasUserScope ? [notificationId, householdId, userId] : [notificationId, householdId],
  });
}

async function recordNotificationInteraction({
  notificationId,
  householdId,
  userId,
  interaction,
  actionId = null,
}) {
  const schema = await getNotificationSchema();
  const hasUserScope = schema.hasNotificationColumn('user_id');
  const hasOpenedAt = schema.hasNotificationColumn('opened_at');
  const hasClickedAt = schema.hasNotificationColumn('clicked_at');

  let setClause = 'read = 1';
  if (hasOpenedAt) {
    setClause += ', opened_at = COALESCE(opened_at, NOW())';
  }
  if (interaction === 'actioned' && hasClickedAt) {
    setClause += ', clicked_at = COALESCE(clicked_at, NOW())';
  }

  const result = await db.execute({
    sql: hasUserScope
      ? `
          UPDATE notifications
          SET ${setClause}
          WHERE id = ?
            AND household_id = ?
            AND (user_id = ? OR user_id IS NULL)
          RETURNING *
        `
      : `
          UPDATE notifications
          SET ${setClause}
          WHERE id = ?
            AND household_id = ?
          RETURNING *
        `,
    args: hasUserScope ? [notificationId, householdId, userId] : [notificationId, householdId],
  });

  const notification = result.rows[0] || null;
  if (notification) {
    await trackBehaviorEvent({
      userId,
      householdId,
      eventName: `notification_${interaction}`,
      eventSource: 'notification',
      context: {
        notificationId,
        actionId,
      },
    });
  }

  return notification;
}

async function upsertPushSubscription({
  householdId,
  userId,
  subscription,
  deviceType = 'pwa',
  platform = 'web',
  userAgent = '',
}) {
  const schema = await getNotificationSchema();
  if (!schema.hasPushSubscriptionsTable) {
    throw createUnsupportedFeatureError(
      'Push subscriptions require the latest database migration. Apply the notification migration first.'
    );
  }

  const endpoint = subscription.endpoint;
  const expirationTime = subscription.expirationTime || null;
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;

  const result = await db.execute({
    sql: `
      INSERT INTO push_subscriptions (
        household_id,
        user_id,
        endpoint,
        p256dh_key,
        auth_key,
        expiration_time,
        device_type,
        platform,
        user_agent,
        is_active,
        last_seen_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
      ON CONFLICT (endpoint) DO UPDATE SET
        household_id = EXCLUDED.household_id,
        user_id = EXCLUDED.user_id,
        p256dh_key = EXCLUDED.p256dh_key,
        auth_key = EXCLUDED.auth_key,
        expiration_time = EXCLUDED.expiration_time,
        device_type = EXCLUDED.device_type,
        platform = EXCLUDED.platform,
        user_agent = EXCLUDED.user_agent,
        is_active = TRUE,
        updated_at = NOW(),
        last_seen_at = NOW()
      RETURNING *
    `,
    args: [
      householdId,
      userId,
      endpoint,
      p256dh,
      auth,
      expirationTime,
      deviceType,
      platform,
      userAgent,
    ],
  });

  return result.rows[0];
}

async function deletePushSubscription({ householdId, userId, endpoint }) {
  const schema = await getNotificationSchema();
  if (!schema.hasPushSubscriptionsTable) {
    return;
  }

  await db.execute({
    sql: `
      DELETE FROM push_subscriptions
      WHERE household_id = ?
        AND user_id = ?
        AND endpoint = ?
    `,
    args: [householdId, userId, endpoint],
  });
}

async function sendTestNotification({ householdId, userId }) {
  return createNotification({
    householdId,
    userId,
    title: 'Teste do motor comportamental',
    message: 'A cadeia completa esta ativa. Toca aqui e regista um movimento em menos de 20 segundos.',
    type: 'motivation',
    tone: 'celebratory',
    actionPayload: {
      type: 'test_push',
      route: '/quick-add',
      date: new Date().toISOString().slice(0, 10),
      action: 'OPEN_DAILY_LOG',
      actions: [
        { action: 'ADD_EXPENSE', title: 'Despesa' },
        { action: 'ADD_INCOME', title: 'Receita' },
      ],
    },
    metadata: {
      triggerType: 'manual_test',
    },
    dedupeKey: `test-push:${userId}:${new Date().toISOString().slice(0, 16)}`,
    sendPush: true,
  });
}

function getPushConfig() {
  return {
    publicKey: VAPID_PUBLIC_KEY,
    enabled: hasPushCredentials(),
  };
}

module.exports = {
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
};
