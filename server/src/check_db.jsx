const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { db } = require('./config/db');

async function check() {
  try {
    const columns = await db.execute({
      sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'debts'",
      args: []
    });
    console.log('Columns in debts:', columns.rows.map(r => r.column_name));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

check();
