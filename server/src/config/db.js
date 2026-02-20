const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

const db = new Database(path.join(__dirname, '../../mwanga_v1.db'));

// Initialize Tables (Schema)
const initDb = () => {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS households (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        household_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(household_id) REFERENCES households(id)
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        category TEXT,
        note TEXT,
        household_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(household_id) REFERENCES households(id)
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        limit_amount REAL NOT NULL,
        household_id INTEGER,
        UNIQUE(category, household_id),
        FOREIGN KEY(household_id) REFERENCES households(id)
      );

      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        saved_amount REAL DEFAULT 0,
        deadline TEXT,
        category TEXT,
        monthly_saving REAL DEFAULT 0,
        household_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(household_id) REFERENCES households(id)
      );

      CREATE TABLE IF NOT EXISTS rentals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        month TEXT NOT NULL,
        landlord TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        household_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(household_id) REFERENCES households(id)
      );

      CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        value REAL NOT NULL,
        household_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(household_id) REFERENCES households(id)
      );

      CREATE TABLE IF NOT EXISTS liabilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        total_amount REAL NOT NULL,
        remaining_amount REAL NOT NULL,
        interest_rate REAL DEFAULT 0,
        household_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(household_id) REFERENCES households(id)
      );

      CREATE TABLE IF NOT EXISTS xitiques (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        monthly_amount REAL NOT NULL,
        total_participants INTEGER NOT NULL,
        frequency TEXT DEFAULT 'mensal',
        start_date TEXT NOT NULL,
        your_position INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        household_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(household_id) REFERENCES households(id)
      );

      CREATE TABLE IF NOT EXISTS xitique_cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        xitique_id INTEGER NOT NULL,
        cycle_number INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        receiver_position INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY(xitique_id) REFERENCES xitiques(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS xitique_contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        xitique_id INTEGER NOT NULL,
        cycle_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        paid INTEGER DEFAULT 0,
        payment_date TEXT,
        FOREIGN KEY(xitique_id) REFERENCES xitiques(id) ON DELETE CASCADE,
        FOREIGN KEY(cycle_id) REFERENCES xitique_cycles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS xitique_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        xitique_id INTEGER NOT NULL,
        cycle_id INTEGER NOT NULL,
        total_received REAL NOT NULL,
        received_date TEXT,
        FOREIGN KEY(xitique_id) REFERENCES xitiques(id) ON DELETE CASCADE,
        FOREIGN KEY(cycle_id) REFERENCES xitique_cycles(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT NOT NULL,
        value TEXT,
        household_id INTEGER,
        PRIMARY KEY(key, household_id),
        FOREIGN KEY(household_id) REFERENCES households(id)
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);
    logger.info('Database tables initialized.');
    
    // Check for migrations
    runMigrations();

  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  }
};

const runMigrations = () => {
  try {
    const settingsColumns = db.prepare("PRAGMA table_info(settings)").all();
    const hasHouseholdId = settingsColumns.some(col => col.name === 'household_id');

    if (!hasHouseholdId && settingsColumns.length > 0) {
      logger.info('Migrating settings table to include household_id...');
      let firstHousehold = db.prepare('SELECT id FROM households LIMIT 1').get();
      if (!firstHousehold) {
        const hInfo = db.prepare("INSERT INTO households (name) VALUES (?)").run('Default Household');
        firstHousehold = { id: hInfo.lastInsertRowid };
      }
      const householdId = firstHousehold.id;

      db.transaction(() => {
        const oldData = db.prepare('SELECT * FROM settings').all();
        db.prepare('DROP TABLE settings').run();
        db.prepare(`
          CREATE TABLE settings (
            key TEXT NOT NULL,
            value TEXT,
            household_id INTEGER,
            PRIMARY KEY(key, household_id),
            FOREIGN KEY(household_id) REFERENCES households(id)
          )
        `).run();

        const insert = db.prepare('INSERT INTO settings (key, value, household_id) VALUES (?, ?, ?)');
        for (const row of oldData) {
          insert.run(row.key, row.value, householdId);
        }
      })();
      logger.info('Settings migration completed.');
    }
  } catch (error) {
    logger.warn('Migration check skipped or failed:', error.message);
  }
};

module.exports = { db, initDb };
