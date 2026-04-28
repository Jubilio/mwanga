const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const whatsAppService = require('../src/services/whatsapp.service');
const { db } = require('../src/config/db');
const { initWhatsAppSchema } = require('../src/services/whatsappMigration.service');
const logger = require('../src/utils/logger');

/**
 * Simulate WhatsApp Script
 * 
 * Usage: node scripts/simulate_whatsapp.js [phone] [message]
 */

const testPhone = process.argv[2] || '258841234567';
const testMessage = process.argv[3] || 'Como estão as minhas finanças hoje?';

async function run() {
  try {
    console.log('\n--- 🚀 Mwanga WhatsApp Simulator ---\n');

    // 0. Ensure schema is ready
    await initWhatsAppSchema();

    // 1. Ensure the test user exists and has the phone number linked
    console.log(`🔍 Verificando utilizador para o número: ${testPhone}...`);
    const userCheck = await db.execute({
      sql: 'SELECT id, name FROM users WHERE whatsapp_number = ?',
      args: [testPhone]
    });

    if (userCheck.rows.length === 0) {
      console.log('⚠️  Nenhum utilizador encontrado com este número.');
      console.log('📝 Vinculando o primeiro utilizador da base de dados para o teste...');
      
      const firstUser = await db.execute('SELECT id, name FROM users LIMIT 1');
      if (firstUser.rows.length === 0) {
        console.error('❌ Erro: Não existem utilizadores na base de dados.');
        process.exit(1);
      }

      const userId = firstUser.rows[0].id;
      await db.execute({
        sql: 'UPDATE users SET whatsapp_number = ? WHERE id = ?',
        args: [testPhone, userId]
      });
      console.log(`✅ Utilizador "${firstUser.rows[0].name}" vinculado com sucesso!`);
    } else {
      console.log(`✅ Utilizador "${userCheck.rows[0].name}" pronto.`);
    }

    // 2. Mock Evolution API Payload
    const mockPayload = {
      event: 'messages.upsert',
      instance: 'MwangaTest',
      data: {
        key: {
          remoteJid: `${testPhone}@s.whatsapp.net`,
          fromMe: false,
          id: 'TEST_MSG_ID_' + Date.now()
        },
        pushName: 'Explorador de Teste',
        message: {
          conversation: testMessage
        },
        messageType: 'conversation'
      }
    };

    console.log(`\n💬 Mensagem enviada: "${testMessage}"`);
    console.log('🧠 Binth está a processar...\n');

    // 3. Process via Service
    const result = await whatsAppService.handleIncomingMessage(mockPayload);

    // 4. Show Result
    console.log('--- 📥 Resposta da Binth ---\n');
    console.log(result.reply);
    console.log('\n----------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro na simulação:', error);
    process.exit(1);
  }
}

run();
