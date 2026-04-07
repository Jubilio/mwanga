const { db } = require('./src/config/db');
require('dotenv').config({ path: './.env' });

async function dumpSchema() {
  try {
    const res = await db.execute({
      sql: `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'push_subscriptions'
      `,
      args: []
    });
    console.log('Schema for push_subscriptions:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error dumping schema:', err.message);
  } finally {
    process.exit();
  }
}

dumpSchema();
