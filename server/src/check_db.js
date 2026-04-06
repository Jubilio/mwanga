const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { db } = require('./config/db');

async function check() {
  try {
    const tables = await db.execute({
      sql: "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
      args: []
    });
    console.log('Tables:', tables.rows.map(r => r.table_name));

    const columns = await db.execute({
      sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications'",
      args: []
    });
    console.log('Columns in notifications:', columns.rows.map(r => r.column_name));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

check();
