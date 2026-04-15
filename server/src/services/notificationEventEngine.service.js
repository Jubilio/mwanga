const EventEmitter = require('events');
const { db } = require('../config/db');
const logger = require('../utils/logger');
const { generatePersonalizedNotification } = require('./notificationAi.service');
const { trackBehaviorEvent } = require('./behaviorTracking.service');

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Maputo';
const DELIVERY_WINDOW_MINUTES = Number(process.env.NOTIFICATION_DELIVERY_WINDOW_MINUTES || 15);

const notificationEventBus = new EventEmitter();
let engineStarted = false;

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: APP_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function getLocalParts(date = new Date()) {
  const day = formatDate(date);
  const time = formatTime(date);
  return {
    date: day,
    time,
    month: day.slice(0, 7),
    dayOfMonth: Number(day.slice(8, 10)),
  };
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return fallback;
}

function isWithinDeliveryWindow(targetTime, nowTime) {
  const [targetHour, targetMinute] = String(targetTime || '00:00').split(':').map(Number);
  const [nowHour, nowMinute] = String(nowTime || '00:00').split(':').map(Number);

  const targetTotal = (targetHour * 60) + targetMinute;
  const nowTotal = (nowHour * 60) + nowMinute;
  return nowTotal >= targetTotal && nowTotal < targetTotal + DELIVERY_WINDOW_MINUTES;
}

async function getUserNotificationSettings(userId, householdId) {
  const result = await db.execute({
    sql: `
      SELECT key, value
      FROM settings
      WHERE household_id = ?
        AND key IN (
          'daily_entry_reminder_enabled',
          'daily_entry_reminder_time',
          'monthly_due_reminder_enabled',
          'monthly_due_reminder_time',
          'monthly_due_reminder_period'
        )
    `,
    args: [householdId],
  });

  const settings = result.rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});

  return {
    user_id: userId,
    household_id: householdId,
    daily_entry_reminder_enabled: parseBoolean(settings.daily_entry_reminder_enabled, true),
    daily_entry_reminder_time: settings.daily_entry_reminder_time || '20:00',
    monthly_due_reminder_enabled: parseBoolean(settings.monthly_due_reminder_enabled, true),
    monthly_due_reminder_time: settings.monthly_due_reminder_time || '08:00',
    monthly_due_reminder_period: settings.monthly_due_reminder_period === 'fim' ? 'fim' : 'inicio',
  };
}

async function getAllUserNotificationSettings() {
  const result = await db.execute({
    sql: `
      SELECT
        u.id AS user_id,
        u.household_id,
        COALESCE(MAX(CASE WHEN s.key = 'daily_entry_reminder_enabled' THEN s.value END), 'true') AS daily_entry_reminder_enabled,
        COALESCE(MAX(CASE WHEN s.key = 'daily_entry_reminder_time' THEN s.value END), '20:00') AS daily_entry_reminder_time,
        COALESCE(MAX(CASE WHEN s.key = 'monthly_due_reminder_enabled' THEN s.value END), 'true') AS monthly_due_reminder_enabled,
        COALESCE(MAX(CASE WHEN s.key = 'monthly_due_reminder_time' THEN s.value END), '08:00') AS monthly_due_reminder_time,
        COALESCE(MAX(CASE WHEN s.key = 'monthly_due_reminder_period' THEN s.value END), 'inicio') AS monthly_due_reminder_period
      FROM users u
      LEFT JOIN settings s
        ON s.household_id = u.household_id
      GROUP BY u.id, u.household_id
    `,
    args: [],
  });

  return result.rows.map((row) => ({
    ...row,
    daily_entry_reminder_enabled: parseBoolean(row.daily_entry_reminder_enabled, true),
    monthly_due_reminder_enabled: parseBoolean(row.monthly_due_reminder_enabled, true),
    monthly_due_reminder_period: row.monthly_due_reminder_period === 'fim' ? 'fim' : 'inicio',
  }));
}

async function createNotificationEvent(userId, eventType, entityType, entityId, eventData = {}) {
  const result = await db.execute({
    sql: `
      INSERT INTO notification_events (user_id, event_type, entity_type, entity_id, event_data)
      VALUES (?, ?, ?, ?, ?::jsonb)
      RETURNING id
    `,
    args: [userId, eventType, entityType, entityId, JSON.stringify(eventData)],
  });
  return result.rows[0]?.id;
}

async function createNotificationCandidate({
  userId,
  eventId,
  type,
  category,
  priority = 0,
  title,
  body,
  payload = {},
  scheduledFor = null
}) {
  const result = await db.execute({
    sql: `
      INSERT INTO notification_candidates (
        user_id, event_id, type, category, priority, title, body, payload, status, scheduled_for
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, 'pending', ?)
      RETURNING id
    `,
    args: [
      userId,
      eventId,
      type,
      category,
      priority,
      title,
      body,
      JSON.stringify(payload),
      scheduledFor || new Date().toISOString()
    ],
  });
  return result.rows[0]?.id;
}

async function buildNotificationDraft({
  householdId,
  userId,
  notificationType,
  triggerType,
  eventContext = {},
  actionPayload = {},
  dedupeKey,
}) {
  const eventId = await createNotificationEvent(userId, triggerType, actionPayload.type, actionPayload.id, eventContext);
  
  const personalized = await generatePersonalizedNotification({
    householdId,
    userId,
    notificationType,
    eventContext: { ...eventContext, triggerType },
    actionPayload,
  });

  return createNotificationCandidate({
    userId,
    eventId,
    type: triggerType,
    category: notificationType,
    priority: triggerType.includes('due') ? 80 : 40,
    title: personalized.title,
    body: personalized.message,
    payload: {
      route: '/quick-add',
      action: 'OPEN_DAILY_LOG',
      ...actionPayload,
      quickActions: personalized.quickActions,
      aiPersonalized: personalized.aiPersonalized,
      dedupeKey
    }
  });
}

async function maybeSendDailyReminder(userSettings, parts) {
  if (!userSettings.daily_entry_reminder_enabled) {
    return;
  }

  if (!isWithinDeliveryWindow(userSettings.daily_entry_reminder_time, parts.time)) {
    return;
  }

  const txResult = await db.execute({
    sql: `
      SELECT COUNT(*) AS total
      FROM transactions
      WHERE household_id = ?
        AND date = ?
    `,
    args: [userSettings.household_id, parts.date],
  });

  const total = Number(txResult.rows[0]?.total || 0);
  if (total > 0) {
    return;
  }

  await buildNotificationDraft({
    householdId: userSettings.household_id,
    userId: userSettings.user_id,
    notificationType: 'reminder',
    triggerType: 'no_transactions_today',
    eventContext: {
      date: parts.date,
      transactionsToday: total,
    },
    actionPayload: {
      type: 'daily_reminder',
      date: parts.date,
      route: '/quick-add',
      action: 'OPEN_DAILY_LOG',
    },
    dedupeKey: `daily-reminder:${userSettings.user_id}:${parts.date}`,
  });
}

async function maybeSendMonthlyCommitmentReminder(userSettings, parts) {
  if (!userSettings.monthly_due_reminder_enabled) {
    return;
  }

  if (!isWithinDeliveryWindow(userSettings.monthly_due_reminder_time, parts.time)) {
    return;
  }

  const isStartWindow = parts.dayOfMonth <= 3;
  const isEndWindow = parts.dayOfMonth >= 27;
  const matchesWindow = userSettings.monthly_due_reminder_period === 'fim' ? isEndWindow : isStartWindow;

  if (!matchesWindow) {
    return;
  }

  const [rentalsRes, debtsRes, xitiqueRes] = await Promise.all([
    db.execute({
      sql: `
        SELECT 0 AS total, 0 AS amount
      `,
      args: [],
    }),
    db.execute({
      sql: `
        SELECT COUNT(*) AS total, COALESCE(SUM(remaining_amount), 0) AS amount
        FROM debts
        WHERE household_id = ?
          AND status = 'pending'
          AND due_date IS NOT NULL
          AND substr(due_date, 1, 7) = ?
      `,
      args: [userSettings.household_id, parts.month],
    }),
    db.execute({
      sql: `
        SELECT COUNT(*) AS total, COALESCE(SUM(c.amount), 0) AS amount
        FROM xitique_contributions c
        JOIN xitique_cycles cy ON cy.id = c.cycle_id
        JOIN xitiques x ON x.id = c.xitique_id
        WHERE x.household_id = ?
          AND x.status = 'active'
          AND c.paid = 0
          AND substr(cy.due_date, 1, 7) = ?
      `,
      args: [userSettings.household_id, parts.month],
    }),
  ]);

  const rentalCount = Number(rentalsRes.rows[0]?.total || 0);
  const debtCount = Number(debtsRes.rows[0]?.total || 0);
  const xitiqueCount = Number(xitiqueRes.rows[0]?.total || 0);
  const totalCommitments = rentalCount + debtCount + xitiqueCount;

  if (totalCommitments === 0) {
    return;
  }

  await buildNotificationDraft({
    householdId: userSettings.household_id,
    userId: userSettings.user_id,
    notificationType: 'reminder',
    triggerType: 'monthly_commitments_due',
    eventContext: {
      month: parts.month,
      totalCommitments,
      rentalCount,
      debtCount,
      xitiqueCount,
    },
    actionPayload: {
      type: 'monthly_commitments',
      date: parts.date,
      route: '/quick-add',
      action: 'OPEN_DAILY_LOG',
    },
    dedupeKey: `monthly-commitments:${userSettings.user_id}:${parts.month}:${userSettings.monthly_due_reminder_period}`,
  });
}

async function maybeSendStreakMotivation(userSettings, parts) {
  if (!isWithinDeliveryWindow(process.env.MOTIVATION_PUSH_TIME || '09:00', parts.time)) {
    return;
  }

  const recentDays = await db.execute({
    sql: `
      SELECT DISTINCT date
      FROM transactions
      WHERE household_id = ?
      ORDER BY date DESC
      LIMIT 7
    `,
    args: [userSettings.household_id],
  });

  const uniqueDays = (recentDays.rows || []).map((row) => row.date);
  if (uniqueDays.length < 3) {
    return;
  }

  let streakDays = 1;
  let cursor = new Date(`${uniqueDays[0]}T00:00:00Z`);

  for (let i = 1; i < uniqueDays.length; i += 1) {
    const nextDate = new Date(`${uniqueDays[i]}T00:00:00Z`);
    const expectedDate = new Date(cursor);
    expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);

    if (nextDate.toISOString().slice(0, 10) !== expectedDate.toISOString().slice(0, 10)) {
      break;
    }

    streakDays += 1;
    cursor = nextDate;
  }

  if (streakDays < 3) {
    return;
  }

  await buildNotificationDraft({
    householdId: userSettings.household_id,
    userId: userSettings.user_id,
    notificationType: 'motivation',
    triggerType: 'savings_streak',
    eventContext: {
      streakDays,
      lastRecordedDate: uniqueDays[0],
    },
    actionPayload: {
      type: 'streak_motivation',
      date: parts.date,
      route: '/quick-add',
      action: 'OPEN_DAILY_LOG',
    },
    dedupeKey: `streak-motivation:${userSettings.user_id}:${parts.date}`,
  });
}

async function evaluateBudgetPressure({
  householdId,
  userId,
  category,
  transactionDate,
}) {
  if (!category) {
    return;
  }

  const result = await db.execute({
    sql: `
      SELECT
        b.limit_amount,
        COALESCE(SUM(t.amount), 0) AS spent
      FROM budgets b
      LEFT JOIN transactions t
        ON t.household_id = b.household_id
       AND t.category = b.category
       AND t.type IN ('despesa', 'renda')
       AND substr(t.date, 1, 7) = ?
      WHERE b.household_id = ?
        AND b.category = ?
      GROUP BY b.limit_amount
    `,
    args: [transactionDate.slice(0, 7), householdId, category],
  });

  const budget = result.rows[0];
  if (!budget || Number(budget.limit_amount || 0) <= 0) {
    return;
  }

  const limit = Number(budget.limit_amount || 0);
  const spent = Number(budget.spent || 0);
  const usagePercent = Math.round((spent / limit) * 100);

  if (usagePercent < 80) {
    return;
  }

  await buildNotificationDraft({
    householdId,
    userId,
    notificationType: 'warning',
    triggerType: 'budget_threshold_reached',
    eventContext: {
      category,
      usagePercent,
      spent,
      limit,
      date: transactionDate,
    },
    actionPayload: {
      type: 'budget_warning',
      date: transactionDate,
      route: '/quick-add',
      action: 'OPEN_DAILY_LOG',
      category,
    },
    dedupeKey: `budget-warning:${userId}:${transactionDate.slice(0, 7)}:${category}`,
  });
}

async function handleTransactionCreated(payload) {
  const { userId, householdId, transaction } = payload;
  await trackBehaviorEvent({
    userId,
    householdId,
    eventName: 'transaction_created',
    eventSource: 'transaction',
    eventValue: transaction.amount,
    context: {
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
    },
  });

  if (transaction.type === 'despesa' || transaction.type === 'renda') {
    await evaluateBudgetPressure({
      householdId,
      userId,
      category: transaction.category,
      transactionDate: transaction.date,
    });
  }

  if (transaction.type === 'poupanca') {
    await buildNotificationDraft({
      householdId,
      userId,
      notificationType: 'motivation',
      triggerType: 'savings_streak',
      eventContext: {
        streakDays: 1,
        category: transaction.category,
        amount: transaction.amount,
      },
      actionPayload: {
        type: 'savings_motivation',
        date: transaction.date,
        route: '/quick-add',
        action: 'OPEN_DAILY_LOG',
      },
      dedupeKey: `savings-celebration:${userId}:${transaction.date}`,
    });
  }
}

async function runUserEngagementSweep({ userId, householdId, now = new Date() }) {
  const parts = getLocalParts(now);
  const settings = await getUserNotificationSettings(userId, householdId);
  await maybeSendDailyReminder(settings, parts);
  await maybeSendMonthlyCommitmentReminder(settings, parts);
  await maybeSendStreakMotivation(settings, parts);
}

async function runScheduledEngagementSweep(now = new Date()) {
  const parts = getLocalParts(now);
  const users = await getAllUserNotificationSettings();

  for (const userSettings of users) {
    try {
      await maybeSendDailyReminder(userSettings, parts);
      await maybeSendMonthlyCommitmentReminder(userSettings, parts);
      await maybeSendStreakMotivation(userSettings, parts);
    } catch (error) {
      logger.warn(`Scheduled notification sweep skipped for user ${userSettings.user_id}: ${error.message}`);
    }
  }
}

function startNotificationEventEngine() {
  if (engineStarted) {
    return;
  }

  notificationEventBus.on('transaction.created', async (payload) => {
    try {
      await handleTransactionCreated(payload);
    } catch (error) {
      logger.warn(`Notification event handler failed: ${error.message}`);
    }
  });

  engineStarted = true;
  logger.info('Notification event engine started.');
}

function publishNotificationEvent(eventName, payload) {
  if (!engineStarted) {
    startNotificationEventEngine();
  }

  setImmediate(() => notificationEventBus.emit(eventName, payload));
}

module.exports = {
  publishNotificationEvent,
  runScheduledEngagementSweep,
  runUserEngagementSweep,
  startNotificationEventEngine,
};
