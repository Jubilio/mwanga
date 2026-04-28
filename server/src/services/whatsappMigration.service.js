const { db } = require('../config/db');
const logger = require('../utils/logger');

async function initWhatsAppSchema() {
  try {
    logger.info('[WhatsApp Migration] Checking schema...');
    
    // Check if whatsapp_number column exists in users table
    // PostgreSQL query for column existence
    const checkColumn = await db.execute({
      sql: `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'whatsapp_number';
      `,
      args: []
    });

    if (checkColumn.rows.length === 0) {
      logger.info('[WhatsApp Migration] Adding whatsapp_number column to users table...');
      await db.execute({
        sql: 'ALTER TABLE public.users ADD COLUMN whatsapp_number VARCHAR(20) UNIQUE;',
        args: []
      });
      logger.info('[WhatsApp Migration] Column added successfully.');
    } else {
      logger.info('[WhatsApp Migration] Schema is up to date.');
    }
  } catch (error) {
    logger.error({ error }, '[WhatsApp Migration] Failed to initialize WhatsApp schema');
    // We don't throw here to avoid crashing the whole app if migration fails
  }
}

module.exports = { initWhatsAppSchema };
