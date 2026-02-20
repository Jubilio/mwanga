const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'dev.db'));
try {
  const rows = db.prepare('SELECT * FROM rentals').all();
  console.log('Rentals Data:', JSON.stringify(rows, null, 2));
} catch (e) {
  console.error(e);
}
db.close();
