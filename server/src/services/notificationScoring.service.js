/**
 * Mwanga Intelligent Notification scoring service.
 * Inspired by the Duolingo engagement model.
 * @file notificationScoring.service.js
 */

/**
 * Scores a notification candidate based on urgency, category, personal relevance, and user fatigue.
 * 
 * @param {Object} params
 * @param {Object} params.candidate - The candidate to score
 * @param {Object} params.stats - User engagement stats (from user_notification_stats)
 * @param {number} params.nowHour - Current local hour (0-23)
 * @returns {number} The computed score
 */
function scoreNotification({ candidate, stats, nowHour }) {
  let score = 0;

  // 1. BASE URGENCY / PRIORITY
  // Use the database priority as a base (scaled to 40)
  score += Math.min(40, (candidate.priority || 0));

  // Category-specific boosters
  const urgencyWeight = {
    'bill_due_today': 40,
    'bill_due_tomorrow': 25,
    'debt_overdue': 35,
    'budget_100_percent': 30,
    'budget_80_percent': 15,
    'goal_milestone_50': 10,
    'inactive_3d': 20,
    'daily_summary': 10,
    'reengagement': 15
  };

  score += (urgencyWeight[candidate.type] || 0);

  // 2. FINANCIAL RELEVANCE
  // High value transactions/budgets get a boost
  if (candidate.payload?.amount > 5000) score += 10;
  if (candidate.category === 'debt') score += 5;

  // 3. RECENCY & FATIGUE (Negative scores)
  // Daily limit penalty: if user already got 2 pushes today, heavily penalize any additional ones
  if (stats.push_sent_today >= 2) {
    score -= 60;
  }

  // Cooldown penalty: if last push was very recent (< 3 hours)
  if (stats.last_push_sent_at) {
    const hoursSince = (Date.now() - new Date(stats.last_push_sent_at).getTime()) / 3600000;
    if (hoursSince < 3) {
      score -= 40;
    }
  }

  // 4. HISTORICAL ENGAGEMENT (Duolingo style)
  const sentLast7d = stats.push_sent_last_7d || 0;
  const openedLast7d = stats.push_opened_last_7d || 0;
  const openRate = sentLast7d > 0 ? (openedLast7d / sentLast7d) : 0.5; // Assume 0.5 for new or quiet users

  if (openRate > 0.6) score += 12; // High engagement user
  if (openRate < 0.2 && sentLast7d > 3) score -= 15; // User ignoring us

  // 5. TIMING OPTIMIZATION
  // If the user typically opens the app at this hour, boost the score
  if (stats.typical_active_hour !== null) {
    const diff = Math.abs(stats.typical_active_hour - nowHour);
    if (diff <= 1) score += 15;
    else if (diff <= 3) score += 8;
  }

  // 6. STREAK CELEBRATION
  if (stats.streak_days >= 3 && candidate.type.includes('streak')) {
    score += 10;
  }

  return score;
}

/**
 * Determines if a candidate is "Sendable" based on current scoring threshold.
 * Default threshold is 45.
 */
function isElegible(computedScore, threshold = 45) {
  return computedScore >= threshold;
}

module.exports = {
  scoreNotification,
  isElegible,
};
