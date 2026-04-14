#!/usr/bin/env node

/**
 * Mwanga Notification Debug Script
 * Verifica status das notificações, subscrições e configuração VAPID
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { db } = require('./src/config/db');
const logger = require('./src/utils/logger');
const { hasPushCredentials, getVapidKeys } = require('./src/services/push.service');

async function debugNotifications() {
    console.log('\n🔍 === MWANGA NOTIFICATION DEBUG === 🔍\n');

    try {
        // 1. VAPID Keys Check
        console.log('✅ 1. CHECKING VAPID KEYS');
        const hasCredentials = hasPushCredentials();
        console.log(`   - VAPID_PUBLIC_KEY: ${process.env.VAPID_PUBLIC_KEY ? '✅ SET' : '❌ MISSING'}`);
        console.log(`   - VAPID_PRIVATE_KEY: ${process.env.VAPID_PRIVATE_KEY ? '✅ SET' : '❌ MISSING'}`);
        console.log(`   - Has Credentials: ${hasCredentials ? '✅ YES' : '❌ NO'}\n`);

        if (!hasCredentials) {
            console.log('⚠️  WARNING: VAPID keys not configured! Push will fail.\n');
        }

        // 2. Database Connection
        console.log('✅ 2. CHECKING DATABASE CONNECTION');
        try {
            const result = await db.execute({
                sql: 'SELECT 1 as test',
                args: [],
            });
            console.log('   - Database: ✅ CONNECTED\n');
        } catch (error) {
            console.log(`   - Database: ❌ ERROR: ${error.message}\n`);
            process.exit(1);
        }

        // 3. Tables Check
        console.log('✅ 3. CHECKING NOTIFICATION TABLES');
        const tables = ['notifications', 'push_subscriptions', 'behavior_events'];

        for (const table of tables) {
            try {
                const result = await db.execute({
                    sql: `SELECT COUNT(*) as count FROM ${table}`,
                    args: [],
                });
                const count = result.rows?.[0]?.count || 0;
                console.log(`   - ${table}: ✅ EXISTS (${count} rows)`);
            } catch (error) {
                console.log(`   - ${table}: ❌ MISSING`);
            }
        }
        console.log();

        // 4. Push Subscriptions Check
        console.log('✅ 4. CHECKING ACTIVE PUSH SUBSCRIPTIONS');
        try {
            const result = await db.execute({
                sql: `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) as inactive
          FROM push_subscriptions
        `,
                args: [],
            });
            const row = result.rows?.[0] || {};
            console.log(`   - Total Subscriptions: ${row.total || 0}`);
            console.log(`   - Active: ✅ ${row.active || 0}`);
            console.log(`   - Inactive: ${row.inactive || 0}\n`);

            if ((row.active || 0) === 0) {
                console.log('⚠️  WARNING: No active subscriptions! Users need to enable push first.\n');
            }
        } catch (error) {
            console.log(`   - Error querying subscriptions: ${error.message}\n`);
        }

        // 5. Recent Notifications
        console.log('✅ 5. RECENT NOTIFICATIONS (Last 5)');
        try {
            const result = await db.execute({
                sql: `
          SELECT 
            id, title, type, status, created_at
          FROM notifications
          ORDER BY created_at DESC
          LIMIT 5
        `,
                args: [],
            });
            if (!result.rows || result.rows.length === 0) {
                console.log('   - No notifications found\n');
            } else {
                result.rows.forEach((n, i) => {
                    console.log(`   ${i + 1}. [${n.status}] ${n.title}`);
                    console.log(`      Type: ${n.type} | Date: ${new Date(n.created_at).toLocaleString()}`);
                });
                console.log();
            }
        } catch (error) {
            console.log(`   - Error: ${error.message}\n`);
        }

        // 6. Failed Deliveries (Last 24h)
        console.log('✅ 6. FAILED DELIVERIES (Last 24h)');
        try {
            const result = await db.execute({
                sql: `
          SELECT 
            COUNT(*) as failed_count,
            MAX(last_error) as last_error
          FROM push_subscriptions
          WHERE is_active = FALSE
            AND updated_at > datetime('now', '-1 day')
        `,
                args: [],
            });
            const row = result.rows?.[0] || {};
            if ((row.failed_count || 0) === 0) {
                console.log('   - No failures: ✅ ALL GOOD\n');
            } else {
                console.log(`   - Failed: ${row.failed_count}`);
                console.log(`   - Last Error: ${row.last_error}\n`);
            }
        } catch (error) {
            console.log(`   - Error: ${error.message}\n`);
        }

        // 7. Recommendations
        console.log('✅ 7. RECOMMENDATIONS');
        const issues = [];

        if (!hasCredentials) issues.push('🔴 VAPID keys missing - configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY');
        if ((row?.active || 0) === 0) issues.push('🟡 No active subscriptions - users need to enable push in Settings');

        if (issues.length === 0) {
            console.log('   ✅ Everything looks good!');
            console.log('\n📝 To send a test notification, login and click the bell icon in Settings.\n');
        } else {
            issues.forEach(issue => console.log(`   ${issue}`));
            console.log();
        }

    } catch (error) {
        console.error('❌ Debug error:', error);
        process.exit(1);
    }

    process.exit(0);
}

debugNotifications();
