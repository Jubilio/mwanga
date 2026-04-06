const http = require('http');

const endpoints = [
  '/api/health',
  '/api/settings',
  '/api/notifications',
  '/api/transactions',
  '/api/goals',
  '/api/budgets',
  '/api/accounts',
  '/api/debts',
  '/api/auth/me'
];

async function checkEndpoints() {
  console.log('Verifying backend endpoints...\n');
  let hasErrors = false;

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(`http://localhost:3001${endpoint}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      // We expect 200 or 401 (unauthorized is fine, just means it's working but we are not logged in)
      if (res.ok || res.status === 401 || res.status === 403 || res.status === 429) {
        console.log(`[PASS] ${endpoint} - Status: ${res.status}`);
      } else {
        console.error(`[FAIL] ${endpoint} - Status: ${res.status}`);
        hasErrors = true;
      }
    } catch (err) {
      console.error(`[ERROR] ${endpoint} - ${err.message}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.log('\n❌ Some endpoints failed or the server is down.');
    process.exit(1);
  } else {
    console.log('\n✅ All endpoints responded successfully.');
    process.exit(0);
  }
}

checkEndpoints();
