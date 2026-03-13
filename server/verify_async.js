const { initDb, db } = require('./src/config/db');
require('dotenv').config();

async function test() {
  try {
    console.log('Initializing DB...');
    await initDb();
    console.log('DB Initialized.');

    console.log('Running test query...');
    const result = await db.execute('SELECT 1 + 1 as sum');
    console.log('Query result:', result.rows[0]);

    if (result.rows[0].sum === 2) {
      console.log('✅ Async LibSQL Verification Successful!');
    } else {
      console.log('❌ Unexpected query result.');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
}

test();
