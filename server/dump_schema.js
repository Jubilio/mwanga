require('dotenv').config({ path: './.env' });
const { db } = require('./src/config/db');

async function dumpSchema() {
  try {
    const res = await db.execute({
      sql: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `,
      args: []
    });
    console.log('Tables:');
    console.table(res.rows);
  } catch (err) {
    console.error('Error dumping schema:', err.message);
  } finally {
    process.exit();
  }
}

dumpSchema();
