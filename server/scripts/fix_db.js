require('dotenv').config();
const { db } = require('../src/config/db');

async function migrate() {
  try {
    console.log('Iniciando migração manual...');
    await db.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20)');
    console.log('Coluna whatsapp_number verificada/criada com sucesso! ✅');

    console.log('Altering debts table...');
    await db.execute('ALTER TABLE debts ADD COLUMN IF NOT EXISTS interest_rate NUMERIC DEFAULT 0');
    await db.execute("ALTER TABLE debts ADD COLUMN IF NOT EXISTS interest_period VARCHAR(20) DEFAULT 'monthly'");
    await db.execute('ALTER TABLE debts ADD COLUMN IF NOT EXISTS months_duration INTEGER DEFAULT 0');
    await db.execute('ALTER TABLE debts ADD COLUMN IF NOT EXISTS monthly_payment NUMERIC DEFAULT 0');
    await db.execute('ALTER TABLE debts ADD COLUMN IF NOT EXISTS principal_amount NUMERIC DEFAULT 0');
    console.log('Debts table altered successfully! ✅');
    
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error.message);
    process.exit(1);
  }
}

migrate();
