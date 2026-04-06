const { db } = require('../config/db');
const logger = require('../utils/logger');

// We avoid a direct require loop by importing the notification function dynamically 
// or relying on an event emitter, but since notifications shouldn't block, we can just require it.
let createSystemNotification = null;

const awardBadge = async (userId, householdId, badgeSlug) => {
  try {
    // Check if user already has it
    const checkRes = await db.execute({
      sql: `SELECT ub.id FROM user_badges ub 
            JOIN badges b ON ub.badge_id = b.id 
            WHERE ub.user_id = $1 AND b.slug = $2`,
      args: [userId, badgeSlug]
    });

    if (checkRes.rows.length > 0) return; // Already awarded

    // Get Badge ID
    const badgeRes = await db.execute({
      sql: 'SELECT id, name, icon, description FROM badges WHERE slug = $1',
      args: [badgeSlug]
    });

    if (badgeRes.rows.length === 0) return; // Badge doesn't exist in DB
    const badge = badgeRes.rows[0];

    // Award it
    await db.execute({
      sql: 'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)',
      args: [userId, badge.id]
    });

    logger.info(`🏆 User ${userId} unlocked badge: ${badge.name}`);

    // Send Notification
    if (!createSystemNotification) {
      const notificationEventEngine = require('./notificationEventEngine.service');
      createSystemNotification = notificationEventEngine.createSystemNotification;
    }

    if (createSystemNotification) {
      await createSystemNotification(
        householdId,
        'badge_unlocked',
        `Nova Conquista: ${badge.icon} ${badge.name}`,
        `Parabéns! Acabaste de desbloquear a medalha "${badge.name}". ${badge.description}`,
        { userId, badgeSlug: badgeSlug }
      );
    }

  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
       // Race condition caught, safely ignore
       return;
    }
    logger.error(`Error in gamification engine (awardBadge): ${error.message}`);
  }
};

const evaluateUserBadges = async (userId, householdId) => {
  try {
    // Evaluate 'primeiros-passos'
    await awardBadge(userId, householdId, 'primeiros-passos');

    // Goals evaluation logic
    const goalsRes = await db.execute({
      sql: 'SELECT target_amount, saved_amount FROM goals WHERE household_id = $1',
      args: [householdId]
    });

    for (const goal of goalsRes.rows) {
      // Fiel Mordomo Nível 2 (100%)
      if (goal.saved_amount >= goal.target_amount && goal.target_amount > 0) {
        await awardBadge(userId, householdId, 'fiel-mordomo-2');
      }
      // Fiel Mordomo Nível 1 (>50%)
      else if (goal.saved_amount >= (goal.target_amount / 2) && goal.target_amount > 0) {
        await awardBadge(userId, householdId, 'fiel-mordomo-1');
      }
    }

    // Xitique evaluation
    const xitiquesRes = await db.execute({
      sql: 'SELECT id FROM xitiques WHERE household_id = $1',
      args: [householdId]
    });

    if (xitiquesRes.rows.length > 0) {
      await awardBadge(userId, householdId, 'comunidade-1');
    }

  } catch (error) {
    logger.error(`Error evaluating user badges for ${userId}: ${error.message}`);
  }
};

module.exports = {
  awardBadge,
  evaluateUserBadges
};
