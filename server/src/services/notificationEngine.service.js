/**
 * Mwanga Intelligent Notification Engine.
 * Responsible for selecting, scoring, and delivering notifications.
 * @file notificationEngine.service.js
 */

const { db } = require('../config/db');
const logger = require('../utils/logger');
const scoringService = require('./notificationScoring.service');
const { sendRawPush } = require('./push.service');

/**
 * Main loop to process pending notification candidates for all users.
 */
async function processNotificationCandidates() {
  logger.info('[NotificationEngine] Starting candidate processing loop...');
  
  try {
    // 1. Find all users who have pending candidates
    const usersRes = await db.execute({
      sql: `
        SELECT DISTINCT user_id 
        FROM notification_candidates 
        WHERE status = 'pending'
      `,
      args: []
    });

    const userIds = usersRes.rows.map(r => r.user_id);
    if (userIds.length === 0) {
      logger.info('[NotificationEngine] No pending candidates to process.');
      return;
    }

    for (const userId of userIds) {
      try {
        await processUserCandidates(userId);
      } catch (userErr) {
        logger.error(`[NotificationEngine] Failed to process candidates for user ${userId}: ${userErr.message}`);
      }
    }

    logger.info('[NotificationEngine] Finished candidate processing loop.');
  } catch (error) {
    logger.error(`[NotificationEngine] CRITICAL Engine Error: ${error.message}`);
  }
}

/**
 * Processes all candidates for a single user and picks the best one.
 */
async function processUserCandidates(userId) {
  // 1. Load User Context (Stats, Preferences, and Subscriptions)
  const [statsRes, prefRes, subsRes, candidatesRes] = await Promise.all([
    db.execute({ sql: 'SELECT * FROM user_notification_stats WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT * FROM notification_preferences WHERE user_id = ?', args: [userId] }),
    db.execute({ sql: 'SELECT id, endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = ? AND is_active = TRUE', args: [userId] }),
    db.execute({ sql: 'SELECT * FROM notification_candidates WHERE user_id = ? AND status = \'pending\'', args: [userId] })
  ]);

  const stats = statsRes.rows[0];
  const prefs = prefRes.rows[0];
  const subscriptions = subsRes.rows || [];
  const candidates = candidatesRes.rows || [];

  if (!prefs || !prefs.push_enabled || subscriptions.length === 0) {
    // User hasn't enabled push or has no subscriptions. Expire their candidates to keep DB clean.
    await db.execute({ 
        sql: 'UPDATE notification_candidates SET status = \'expired\', skip_reason = \'push_disabled_or_no_sub\' WHERE user_id = ? AND status = \'pending\'', 
        args: [userId] 
    });
    return;
  }

  const now = new Date();
  const nowHour = now.getHours();

  // 2. Score all candidates
  const scoredCandidates = candidates.map(candidate => {
    const score = scoringService.scoreNotification({
      candidate,
      stats: stats || { push_sent_today: 0, push_sent_last_7d: 0, push_opened_last_7d: 0 },
      nowHour
    });
    return { ...candidate, computed_score: score };
  });

  // 3. Filter and Pick Best
  // Threshold is 45 for standard delivery. 
  // We only pick ONE best candidate per processing run (Duolingo style)
  const eligible = scoredCandidates
    .filter(c => c.computed_score >= 45)
    .sort((a, b) => b.computed_score - a.computed_score);

  if (eligible.length === 0) {
    // If we have candidates but none are "worthy" yet, we leave them 'pending' for the next run (or expiry)
    // However, if they are older than 24h, we should expire them.
    await expireOldCandidates(userId);
    return;
  }

  const bestCandidate = eligible[0];

  // 4. Delivery Constraint Checks (Phase 3 safeguards)
  const constraint = checkDeliveryConstraints(bestCandidate, prefs, stats, nowHour);
  if (!constraint.allowed) {
    logger.info(`[NotificationEngine] Delivery skipped for user ${userId}, candidate ${bestCandidate.id}: ${constraint.reason}`);
    
    // If it's a transient constraint (like Quiet Hours), keep pending.
    // If it's a hard limit (Daily Limit), we might cancel/skip this specific candidate if it won't be relevant tomorrow.
    if (constraint.reason === 'daily_limit' || constraint.reason === 'too_many_skipped') {
        await markCandidateStatus(bestCandidate.id, 'skipped', constraint.reason);
    }
    return;
  }

  // 5. Dispatch
  const dispatchResult = await dispatchNotification(bestCandidate, userId, subscriptions);

  if (dispatchResult.success) {
    await markCandidateStatus(bestCandidate.id, 'sent');
    await updateStatsAfterSend(userId);
  } else {
    await markCandidateStatus(bestCandidate.id, 'failed', dispatchResult.error);
  }
}

function checkDeliveryConstraints(candidate, prefs, stats, hour) {
  // Quiet Hours (22h - 07h) - Strict unless priority > 90
  const isQuiet = prefs.quiet_hours_start > prefs.quiet_hours_end 
    ? (hour >= prefs.quiet_hours_start || hour < prefs.quiet_hours_end)
    : (hour >= prefs.quiet_hours_start && hour < prefs.quiet_hours_end);

  if (isQuiet && candidate.priority < 90) {
    return { allowed: false, reason: 'quiet_hours' };
  }

  // Daily Limit
  if (stats && stats.push_sent_today >= prefs.max_push_per_day) {
    return { allowed: false, reason: 'daily_limit' };
  }

  // Cooldown (e.g. 3 hours)
  if (stats && stats.last_push_sent_at) {
    const diffMin = (Date.now() - new Date(stats.last_push_sent_at).getTime()) / 60000;
    if (diffMin < prefs.minimum_gap_minutes) {
      return { allowed: false, reason: 'cooldown' };
    }
  }

  return { allowed: true };
}

async function dispatchNotification(candidate, userId, subscriptions) {
  // Use a format compatible with the PWA service worker
  const payload = {
    title: candidate.title,
    body: candidate.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      ...candidate.payload,
      candidateId: candidate.id,
      type: candidate.type,
      route: candidate.payload?.route || '/quick-add',
      title: candidate.title,
    },
  };

  let successCount = 0;
  let lastError = null;

  for (const sub of subscriptions) {
    try {
      const result = await sendRawPush(payload, sub, {
        ttl: candidate.category === 'warning' ? 120 : 3600,
        urgency: candidate.category === 'warning' ? 'high' : 'normal',
      });

      if (result.success) {
        successCount++;
        await logDelivery(candidate.id, userId, sub.id, 'sent');
      } else {
        lastError = result.message;
        await logDelivery(candidate.id, userId, sub.id, 'failed', result.message);

        // Invalidate if 410 Gone or 404
        if (result.statusCode === 410 || result.statusCode === 404) {
          await db.execute({ sql: 'UPDATE push_subscriptions SET is_active = FALSE WHERE id = ?', args: [sub.id] });
        }
      }
    } catch (err) {
      lastError = err.message;
      logger.error(`[NotificationEngine] Error in dispatch loop for subscription ${sub.id}: ${err.message}`);
    }
  }

  return { success: successCount > 0, error: lastError };
}

async function logDelivery(candidateId, userId, subscriptionId, status, error = null) {
  await db.execute({
    sql: `
      INSERT INTO notification_delivery_logs (candidate_id, user_id, subscription_id, status, error_message)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [candidateId, userId, subscriptionId, status, error]
  });
}

async function markCandidateStatus(id, status, reason = null) {
  await db.execute({
    sql: 'UPDATE notification_candidates SET status = ?, skip_reason = ?, sent_at = ? WHERE id = ?',
    args: [status, reason, status === 'sent' ? new Date().toISOString() : null, id]
  });
}

async function updateStatsAfterSend(userId) {
  await db.execute({
    sql: `
      UPDATE user_notification_stats 
      SET 
        push_sent_today = push_sent_today + 1,
        push_sent_last_7d = push_sent_last_7d + 1,
        last_push_sent_at = NOW(),
        updated_at = NOW()
      WHERE user_id = ?
    `,
    args: [userId]
  });
}

async function expireOldCandidates(userId) {
  await db.execute({
    sql: `
      UPDATE notification_candidates 
      SET status = 'expired', skip_reason = 'age' 
      WHERE user_id = ? 
        AND status = 'pending' 
        AND created_at < (NOW() - INTERVAL '24 hours')
    `,
    args: [userId]
  });
}

module.exports = {
  processNotificationCandidates,
};
