require('dotenv').config();
const { pool } = require('./src/config/db');

async function verify() {
  console.log('--- Mwanga Schema Audit ---');
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = res.rows.map(r => r.table_name);
    console.log('Tables found:', tables.length);
    
    for (const table of tables) {
      const countRes = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
      console.log(`- ${table}: ${countRes.rows[0].count} records`);
    }
    
    console.log('\n--- Environment Variables Check ---');
    const vars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'OPENROUTER_API_KEY',
      'GEMINI_API_KEY',
      'GROQ_API_KEY',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN'
    ];
    
    vars.forEach(v => {
      console.log(`${v}: ${process.env[v] ? '✅ defined' : '❌ MISSING'}`);
    });

  } catch (err) {
    console.error('Audit failed:', err.message);
  } finally {
    await pool.end();
  }
}

verify();
