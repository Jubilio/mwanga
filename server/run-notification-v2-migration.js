const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './.env' }); // MUST BE FIRST

const { db } = require('./src/config/db');

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '2026-04-07-notification-engine-v2.sql');
    const fullSql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by semicolon (not perfect but often works)
    const commands = fullSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    console.log(`Executing ${commands.length} SQL commands...`);
    
    for (let i = 0; i < commands.length; i++) {
        console.log(`Executing command ${i+1}/${commands.length}...`);
        try {
            await db.execute({ sql: commands[i] + ';', args: [] });
        } catch (err) {
            // If table already exists, continue, otherwise throw
            if (err.message.includes('already exists')) {
                console.warn(`Warning: Object in command ${i+1} already exists. Skipping...`);
            } else {
                console.error(`Error in command ${i+1}: ${err.message}`);
                throw err;
            }
        }
    }
    
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
