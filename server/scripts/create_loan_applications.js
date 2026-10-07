require('dotenv').config();
const { pool } = require('../src/config/db');
const logger = require('../src/utils/logger');

async function run() {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    logger.info('Creating loan_applications table if it does not exist...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.loan_applications (
        id SERIAL PRIMARY KEY,
        household_id INTEGER REFERENCES public.households(id) ON DELETE CASCADE,
        amount DECIMAL(12, 2) NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await client.query('ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY');
    await client.query('REVOKE ALL PRIVILEGES ON TABLE public.loan_applications FROM PUBLIC, anon, authenticated');
    await client.query('COMMIT');
    logger.info('SUCCESS: loan_applications table is verified/created.');
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    process.exitCode = 1;
    logger.error('Failed to create loan_applications table:', err);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

run();
