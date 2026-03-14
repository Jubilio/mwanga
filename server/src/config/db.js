const { Pool } = require('pg');
const logger = require('../utils/logger');

// PostgreSQL connection URL (e.g., from Supabase)
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  logger.error('DATABASE_URL is missing! PostgreSQL connection cannot be established.');
} else {
  if (connectionString.startsWith('http')) {
    logger.warn('⚠️ DATABASE_URL seems to be an HTTPS URL. PostgreSQL requires a string starting with postgres://');
  }
  const host = connectionString.split('@')[1] || 'invalid host format';
  logger.info(`Connecting to PostgreSQL database: ${host.split(':')[0]}`);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Supabase/Render connections
  }
});

// Wrapper to maintain compatibility with existing code that used .execute({sql, args})
const db = {
  execute: async (params) => {
    let query, values;
    
    if (typeof params === 'string') {
      query = params;
      values = [];
    } else {
      query = params.sql;
      values = params.args || [];
    }

    // Convert SQL naming from ? to $1, $2, etc (PostgreSQL style)
    let index = 1;
    const pgSql = query.replace(/\?/g, () => `$${index++}`);

    try {
      const result = await pool.query(pgSql, values);
      return {
        rows: result.rows,
        // Mocking lastInsertRowid for compatibility, though it needs careful use in controllers
        lastInsertRowid: result.rows[0]?.id || null,
        rowCount: result.rowCount
      };
    } catch (error) {
      logger.error(`Database Query Error: ${error.message} \nSQL: ${pgSql}`);
      throw error;
    }
  },
  batch: async (queries, mode = "write") => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const q of queries) {
        const sql = q.sql;
        const args = q.args || [];
        let index = 1;
        const pgSql = sql.replace(/\?/g, () => `$${index++}`);
        const res = await client.query(pgSql, args);
        results.push({
          rows: res.rows,
          lastInsertRowid: res.rows[0]?.id || null,
          rowCount: res.rowCount
        });
      }
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Database Batch Error: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  },
  query: (sql, params) => pool.query(sql, params)
};

const initDb = async () => {
  try {
    // Tables are expected to be created via the provided supabase_schema.sql manually or via the app
    // For safety, we can run a simple health check query
    await db.execute('SELECT NOW()');
    logger.info('Database connection verified.');
  } catch (error) {
    logger.error('Database connection failed:', error);
    // In production, we might not want to exit immediately if DB is temporarily down,
    // but for migration phase it's better to be explicit.
    if (process.env.NODE_ENV === 'production') {
       console.error('CRITICAL: Database connection failed.');
    } else {
       // process.exit(1); 
    }
  }
};

module.exports = { db, pool, initDb };
