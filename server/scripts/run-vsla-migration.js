const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { db, pool, initDb } = require('../src/config/db');
const logger = require('../src/utils/logger');

async function runMigration() {
  try {
    logger.info('Starting VSLA Database Migration...');
    await initDb();
    
    const migrationSql = fs.readFileSync(path.join(__dirname, '..', 'vsla_migration.sql'), 'utf8');
    
    // Split by semicolon but handle decimals/comments if needed. 
    // For simplicity, we can try to execute the whole block if the driver supports it, 
    // or split by statements. Pg-pool query supports multiple statements.
    
    logger.info('Executing SQL statements one by one...');
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (let i = 0; i < statements.length; i++) {
        logger.info(`Executing statement ${i + 1}/${statements.length}...`);
        await db.execute({ sql: statements[i] + ';', args: [] });
    }
    
    logger.info('VSLA Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
