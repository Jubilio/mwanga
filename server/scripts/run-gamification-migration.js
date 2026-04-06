const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { db, initDb } = require('../src/config/db');
const logger = require('../src/utils/logger');

async function runMigration() {
  try {
    logger.info('Starting Gamification & Multi-Member Database Migration...');
    await initDb();
    
    const migrationSql = fs.readFileSync(path.join(__dirname, '..', 'gamification_migration.sql'), 'utf8');
    
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (let i = 0; i < statements.length; i++) {
        logger.info(`Executing statement ${i + 1}/${statements.length}...`);
        await db.execute({ sql: statements[i] + ';', args: [] });
    }
    
    logger.info('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
