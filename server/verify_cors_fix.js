const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://mwanga-qdsmbf6ck-jubilio-projects.vercel.app',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'Content-Type, Authorization'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
  
  if (res.headers['access-control-allow-origin'] === 'https://mwanga-qdsmbf6ck-jubilio-projects.vercel.app') {
    console.log('✅ CORS Verification Passed!');
  } else {
    console.log('❌ CORS Verification Failed:');
    console.log(`Expected: https://mwanga-qdsmbf6ck-jubilio-projects.vercel.app`);
    console.log(`Received: ${res.headers['access-control-allow-origin']}`);
  }
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
