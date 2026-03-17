require('dotenv').config();
const { db, pool, initDb } = require('./src/config/db');
const logger = require('./src/utils/logger');

async function runHealthCheck() {
  console.log('--- Mwanga Database Health Check ---');
  
  try {
    await initDb();
    
    // Check main tables
    const tables = ['users', 'households', 'transactions', 'financial_messages', 'loans', 'loan_payments'];
    
    console.log('\nTable Record Counts:');
    for (const table of tables) {
      try {
        const result = await db.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`- ${table}: ${result.rows[0].count}`);
      } catch (e) {
        console.log(`- ${table}: ❌ table might not exist (${e.message})`);
      }
    }
    
    // Check recent activity
    const recentTx = await db.execute("SELECT COUNT(*) as count FROM transactions WHERE created_at >= NOW() - INTERVAL '7 days'");
    console.log(`\nRecent Activity (7 days):`);
    console.log(`- New transactions: ${recentTx.rows[0].count}`);
    
    console.log('\n--- Health Check Complete ---');
  } catch (error) {
    console.error('\n❌ Health Check Failed:', error.message);
  } finally {
    await pool.end();
  }
}

runHealthCheck();
