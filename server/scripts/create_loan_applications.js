require('dotenv').config();
const { db, pool } = require('../src/config/db');
const logger = require('../src/utils/logger');

async function run() {
  try {
    logger.info('Creating loan_applications table if it does not exist...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS public.loan_applications (
        id SERIAL PRIMARY KEY,
        household_id INTEGER REFERENCES public.households(id) ON DELETE CASCADE,
        amount DECIMAL(12, 2) NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    logger.info('SUCCESS: loan_applications table is verified/created.');
  } catch (err) {
    logger.error('Failed to create loan_applications table:', err);
  } finally {
    await pool.end();
  }
}

run();
