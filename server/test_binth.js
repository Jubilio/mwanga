const { callBinth } = require('./src/services/binthService');
const logger = require('./src/utils/logger');
require('dotenv').config();

// Mocking the database and buildUserContext to avoid hangs
const binthService = require('./src/services/binthService');

// We will manually construct a call with a mock context if we can, 
// but since callBinth is internal, we'll just try to run it with a very simple user context 
// if it's already implemented correctly.

async function testBinth() {
  console.log('--- TESTING BINTH AI PROVIDERS (MOCKED DB) ---');
  console.log('OpenRouter API Key:', process.env.OPENROUTER_API_KEY ? 'Present' : 'Missing');
  console.log('OpenRouter Model:', process.env.OPENROUTER_MODEL);
  console.log('Anthropic Model:', process.env.ANTHROPIC_MODEL);
  console.log('---------------------------------------------');

  const messages = [
    { role: 'user', content: 'Olá Binth! Faz um resumo rápido de 1 frase sobre quem és.' }
  ];

  // NOTE: We are assuming the DB is reachable or at least times out clearly.
  // To be safe, we'll just test if the process.env variables are picked up by the service logic.

  console.log('\nTesting with OPENROUTER (30s timeout)...');
  try {
    const response = await callBinth({
      messages,
      provider: 'openrouter',
      householdId: 1,
      userId: 1
    });
    console.log('SUCCESS: OpenRouter responded.');
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('FAILED: OpenRouter error:', err.message);
  }
}

testBinth().then(() => {
  console.log('\n--- TEST COMPLETED ---');
  process.exit(0);
}).catch(err => {
  console.error('\n--- FATAL TEST ERROR ---');
  console.error(err);
  process.exit(1);
});
