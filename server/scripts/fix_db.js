const { db } = require('../src/config/db');

async function migrate() {
  try {
    console.log('Iniciando migração manual...');
    await db.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20)');
    console.log('Coluna whatsapp_number verificada/criada com sucesso! ✅');
    process.exit(0);
  } catch (error) {
    console.error('Erro na migração:', error.message);
    process.exit(1);
  }
}

migrate();
