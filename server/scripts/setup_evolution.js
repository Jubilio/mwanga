require('dotenv').config();
const axios = require('axios');

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://localhost:8080';
const API_KEY = process.env.EVOLUTION_API_KEY || 'mwanga_secret_key_2024';
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE || 'MwangaMain';
const WEBHOOK_URL = 'http://host.docker.internal:3001/api/whatsapp/webhook';

async function setup() {
  console.log(`🚀 Iniciando configuração da Evolution API em ${EVOLUTION_URL}...`);

  try {
    // 1. Criar Instância
    console.log(`📦 Criando instância: ${INSTANCE_NAME}...`);
    try {
      const createRes = await axios.post(`${EVOLUTION_URL}/instance/create`, {
        instanceName: INSTANCE_NAME,
        token: API_KEY,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      }, {
        headers: { apikey: API_KEY }
      });
      console.log('✅ Instância criada com sucesso!');
    } catch (err) {
      if (err.response && err.response.status === 403 && err.response.data.message?.includes('already exists')) {
        console.log('ℹ️ A instância já existe. Continuando...');
      } else {
        throw new Error(`Erro ao criar instância: ${err.message}`);
      }
    }

    // 2. Configurar Webhook
    console.log(`🔗 Configurando webhook para: ${WEBHOOK_URL}...`);
    const webhookRes = await axios.post(`${EVOLUTION_URL}/webhook/set/${INSTANCE_NAME}`, {
      webhook: {
        enabled: true,
        url: WEBHOOK_URL,
        webhook_by_events: false,
        events: [
          "MESSAGES_UPSERT",
          "QRCODE_UPDATED",
          "CONNECTION_UPDATE",
          "MESSAGES_UPDATE",
          "SEND_MESSAGE"
        ]
      }
    }, {
      headers: { apikey: API_KEY }
    });
    console.log('✅ Webhook configurado com sucesso!');

    // 3. Obter QR Code (opcional apenas para mostrar que está pronto)
    console.log('\n--- TUDO PRONTO ---');
    console.log(`Para conectar o WhatsApp, aceda a: ${EVOLUTION_URL}/instance/connect/${INSTANCE_NAME}`);
    console.log('Ou verifique os logs do servidor para o QR Code em Base64.');

  } catch (error) {
    console.error('❌ Falha na configuração:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Dados:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    console.log('\n💡 Certifique-se de que o Docker está a correr e a Evolution API está acessível em:', EVOLUTION_URL);
  }
}

setup();
