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

const poolConfig = {
  connectionString,
  max: 25, // Increased from 10 to 25 for concurrent scheduler tasks
  idleTimeoutMillis: 60000, // Increased from 30s to 60s
  connectionTimeoutMillis: 30000, // Increased from 10s to 30s (crucial for latency spikes)
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Only enable SSL if not explicitly disabled in the connection string
if (connectionString && !connectionString.includes('sslmode=disable')) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
}

logger.info(`Database Config (Stable): Pool Max=${poolConfig.max}, SSL=${!!poolConfig.ssl}, Timeout=30s`);
const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  // Common error with PgBouncer/Supabase, we log it but the pool recovers
  if (err.message.includes('terminated unexpectedly') || err.message.includes('timeout')) {
    logger.warn(`Pool warning: ${err.message}`);
  } else {
    logger.error('Unexpected error on idle database client', err);
  }
});

// Wrapper to maintain compatibility with existing code that used .execute({sql, args})
const db = {
  execute: async (params, retry = true) => {
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
        lastInsertRowid: result.rows[0]?.id || null,
        rowCount: result.rowCount
      };
    } catch (error) {
      // Offline / DNS Errors
      if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.message.includes('getaddrinfo')) {
        logger.warn(`Database offline or unreachable (Check your internet connection): ${error.message}`);
        throw new Error('Database is offline');
      }

      // Retry for both terminated connections AND connection timeouts
      const isRetryable = error.message.includes('terminated unexpectedly') || 
                          error.message.includes('timeout') ||
                          error.message.includes('connection error');

      if (retry && isRetryable) {
        logger.warn(`Database connection spike. Retrying query (${error.message.split('\n')[0]})...`);
        return db.execute(params, false);
      }

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
      
      if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.message.includes('getaddrinfo')) {
        logger.warn(`Database offline or unreachable during batch execution: ${error.message}`);
        throw new Error('Database is offline');
      }

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
    logger.info('Verifying database connection...');
    if (!connectionString) {
      throw new Error('DATABASE_URL is missing from environment variables!');
    }
    // Tables are expected to be created via the provided supabase_schema.sql manually or via the app
    // For safety, we can run a simple health check query
    await db.execute('SELECT NOW()');
  } catch (error) {
    logger.error('Database connection failed:', error.message);
    throw error; // Let server.js handle the crash
  }
};

module.exports = { db, pool, initDb };
