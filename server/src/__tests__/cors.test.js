const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { corsOptions, allowedMethods } = require('../config/cors');

function preflight(origin, method) {
  return new Promise((resolve) => {
    const headers = {};
    const req = { method: 'OPTIONS', headers: { origin, 'access-control-request-method': method } };
    const res = {
      statusCode: 200,
      setHeader: (k, v) => { headers[k.toLowerCase()] = v; },
      getHeader: (k) => headers[k.toLowerCase()],
      end: () => resolve({ status: res.statusCode, headers })
    };
    cors(corsOptions)(req, res, () => resolve({ status: 'next', headers }));
  });
}

describe('CORS config', () => {
  test('preflight allows PATCH from the production frontend', async () => {
    const { status, headers } = await preflight('https://mwanga-opal.vercel.app', 'PATCH');
    expect(status).toBe(204);
    expect(headers['access-control-allow-origin']).toBe('https://mwanga-opal.vercel.app');
    expect(headers['access-control-allow-methods']).toContain('PATCH');
  });

  test('unknown origins are not reflected', async () => {
    const { headers } = await preflight('https://evil.example.com', 'PATCH');
    expect(headers['access-control-allow-origin']).toBeUndefined();
  });

  test('every HTTP method used by a router is allowed', () => {
    const dir = path.join(__dirname, '..', 'routes');
    const used = new Set();
    for (const file of fs.readdirSync(dir)) {
      const src = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const m of src.matchAll(/router\.(get|post|put|patch|delete)\(/g)) used.add(m[1].toUpperCase());
    }
    for (const method of used) expect(allowedMethods).toContain(method);
  });
});
