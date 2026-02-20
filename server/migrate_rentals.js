const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'dev.db'));

try {
  // Check if tenant column exists
  const info = db.prepare('PRAGMA table_info(rentals)').all();
  const hasTenant = info.some(c => c.name === 'tenant');
  
  if (hasTenant) {
    console.log('Renaming tenant to landlord...');
    db.exec('ALTER TABLE rentals RENAME COLUMN tenant TO landlord;');
    console.log('Done.');
  } else {
    console.log('Column landlord already exists or tenant is missing.');
  }
} catch (e) {
  console.error(e);
}
db.close();
