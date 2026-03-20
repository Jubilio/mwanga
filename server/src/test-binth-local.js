/**
 * Test script for Binth Local Intelligence
 * Run with: node test-binth-local.js
 */
const { buildUserContext } = require('./services/binthService');

// Mock db for testing
// This script will actually try to hit the DB if I don't mock it, 
// but I can just test the function logic if I import the internal functions.
// Since I can't easily import internal functions without exporting them, 
// I'll just check if the code compiles and if I can call callBinth with dummy data.

async function runTest() {
  console.log('--- Binth Local Intelligence Test ---');
  
  // Test case: All providers fail, should use fallback
  const { callBinth } = require('./services/binthService');
  
  try {
    const response = await callBinth({
      messages: [{ role: 'user', content: 'Estou preocupado com as minhas dívidas' }],
      apiKey: 'invalid_key', // This will force fallbacks
      provider: 'gemini',
      householdId: 'test_id', // Change to a real ID for full test
      userId: 'test_id'      // Change to a real ID for full test
    });
    
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

runTest();
