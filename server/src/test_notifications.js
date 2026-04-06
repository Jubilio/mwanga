const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { db } = require('./config/db');
const { runUserEngagementSweep } = require('./services/notificationEventEngine.service');
const logger = require('./utils/logger');

async function test() {
  try {
    // 1. Get a sample user
    const userRes = await db.execute('SELECT id, household_id FROM users LIMIT 1');
    if (userRes.rows.length === 0) {
      console.log('No users found to test.');
      process.exit(0);
    }
    const user = userRes.rows[0];
    console.log(`Testing notifications for User ID: ${user.id}, Household ID: ${user.household_id}`);

    // 2. Force an AI personalized notification for Budget Warning
    console.log('Generating AI-personalized budget warning...');
    const notifyService = require('./services/notification.service');
    
    await notifyService.createNotification({
      householdId: user.household_id,
      userId: user.id,
      notificationType: 'warning',
      triggerType: 'budget_threshold_reached',
      eventContext: {
        category: 'Alimentacao',
        usagePercent: 85,
        spent: 8500,
        limit: 10000,
        date: new Date().toISOString().slice(0, 10),
      },
      actionPayload: {
        type: 'budget_warning',
        date: new Date().toISOString().slice(0, 10),
        route: '/quick-add',
        action: 'OPEN_DAILY_LOG',
        category: 'Alimentacao',
      },
      dedupeKey: `test-warning:${user.id}:${new Date().getTime()}`,
      sendPush: false
    });

    // 3. Check the notifications table for the latest entry
    const notifyRes = await db.execute({
      sql: 'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      args: [user.id]
    });

    if (notifyRes.rows.length > 0) {
      const last = notifyRes.rows[0];
      console.log('--- LATEST NOTIFICATION ---');
      console.log('Title:', last.title);
      console.log('Message:', last.message);
      console.log('Type:', last.type);
      console.log('Tone:', last.tone);
      console.log('AI Personalized:', last.metadata?.aiPersonalized);
      console.log('Quick Actions:', JSON.stringify(last.action_payload?.quickActions || []));
      console.log('--------------------------');
    } else {
      console.log('No notification was generated. This might be because the user already has data logged or criteria not met.');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

test();
