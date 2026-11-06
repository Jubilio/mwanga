// Every API route refuses a request without a valid session, except the short
// list of routes that are public on purpose (login, sign-up, password reset,
// webhooks with their own secret, OAuth callbacks). A new route that forgets
// `authenticate` fails here.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
jest.mock('../config/db', () => ({ db: { execute: jest.fn().mockResolvedValue({ rows: [] }), batch: jest.fn().mockResolvedValue([]), withTransaction: jest.fn() } }));
jest.mock('../config/redis', () => ({ redis: null }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

const ROUTES_DIR = path.join(__dirname, '../routes');

// method + mount + path that may answer without a session.
// Each is public on purpose; adding one here needs a reason.
const PUBLIC = new Set([
  'POST /api/auth/register', 'POST /api/auth/login',            // creating or opening a session
  'POST /api/auth/google', 'POST /api/auth/google-access-token', // Google sign-in (token checked with Google)
  'POST /api/auth/forgot-password', 'POST /api/auth/reset-password', // recovery (own rate limit + code)
  'GET /api/email/unsubscribe', 'POST /api/email/unsubscribe', 'POST /api/email/resubscribe', // signed link in emails
]);

function listRoutes(router, prefix) {
  const out = [];
  for (const layer of router.stack || []) {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const p of paths) for (const m of Object.keys(layer.route.methods)) out.push({ method: m.toUpperCase(), path: prefix + p });
    } else if (layer.handle?.stack) {
      out.push(...listRoutes(layer.handle, prefix));
    }
  }
  return out;
}

const MOUNTS = {
  'admin.routes.js': '/api/admin', 'auth.routes.js': '/api/auth', 'behavior.routes.js': '/api/behavior',
  'credit.routes.js': '/api/credit', 'email.routes.js': '/api/email', 'feedback.routes.js': '/api/feedback',
  'files.routes.js': '/api/files', 'finance.routes.js': '/api', 'invite.routes.js': '/api/households',
  'kyc.routes.js': '/api/kyc', 'notification.routes.js': '/api/notifications', 'smsRoutes.js': '/api/sms',
  'vsla.routes.js': '/api/vsla', 'webauthn.routes.js': '/api/auth/webauthn', 'whatsapp.routes.js': '/api/whatsapp',
};

test('every route except the public list refuses a request without a session', async () => {
  const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));
  for (const file of files) expect(MOUNTS[file]).toBeDefined(); // a new routes file must be listed above
  const app = express();
  app.use(express.json());
  const all = [];
  for (const file of files) {
    const router = require(path.join(ROUTES_DIR, file));
    app.use(MOUNTS[file], router);
    all.push(...listRoutes(router, MOUNTS[file]));
  }
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: err.message }));
  expect(all.length).toBeGreaterThan(80);

  const server = http.createServer(app).listen(0);
  const { port } = server.address();
  const open = [];
  try {
    for (const r of all) {
      const url = `http://127.0.0.1:${port}${r.path.replace(/:[a-zA-Z_]+/g, '1')}`;
      const res = await fetch(url, { method: r.method, headers: { 'content-type': 'application/json' }, body: ['GET', 'HEAD'].includes(r.method) ? undefined : '{}' });
      if (res.status !== 401 && res.status !== 403) open.push(`${r.method} ${r.path}`);
    }
  } finally {
    server.close();
  }
  expect(open.sort()).toEqual([...PUBLIC].sort());
});
