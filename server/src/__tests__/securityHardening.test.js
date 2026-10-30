process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const { isAdmin } = require('../middleware/auth.middleware');
const { verifyWhatsAppWebhook, twilioSignature } = require('../middleware/whatsappWebhook.middleware');
const { isOwner, resolveFile } = require('../utils/uploads');
const filesRoutes = require('../routes/files.routes');

const res = () => { const r = { status: jest.fn(), json: jest.fn() }; r.status.mockReturnValue(r); return r; };
const tokenFor = (id) => `Bearer ${jwt.sign({ id, householdId: 1, role: 'admin' }, process.env.JWT_SECRET)}`;

beforeEach(() => jest.clearAllMocks());

describe('isAdmin', () => {
  test('ignores the role inside the token and asks the database', async () => {
    db.execute.mockResolvedValueOnce({ rows: [{ role: 'user' }] });
    const response = res(); const next = jest.fn();
    await isAdmin({ user: { id: 4, role: 'admin' } }, response, next);
    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
  });

  test('lets a current admin through', async () => {
    db.execute.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
    const next = jest.fn();
    await isAdmin({ user: { id: 1, role: 'user' } }, res(), next);
    expect(next).toHaveBeenCalled();
  });
});

describe('upload ownership', () => {
  test('matches the owner prefix exactly', () => {
    expect(isOwner('kyc', '12-document-1-abc.png', 12)).toBe(true);
    expect(isOwner('kyc', '12-document-1-abc.png', 1)).toBe(false);
    expect(isOwner('feedback', 'feedback-7-screenshot-1-abc.png', 7)).toBe(true);
    expect(isOwner('feedback', 'feedback-7-screenshot-1-abc.png', 71)).toBe(false);
  });

  test('refuses unknown folders and path tricks', () => {
    expect(resolveFile('secret', 'a.png')).toBeNull();
    expect(resolveFile('kyc', '..%2F..%2F.env')).toBeNull();
    expect(resolveFile('kyc', '../../.env')).toBeNull();
    expect(resolveFile('kyc', '1-document-1-abc.png')).toMatch(/uploads[\\/]kyc[\\/]1-document-1-abc\.png$/);
  });
});

describe('GET /api/files', () => {
  const dir = path.join(__dirname, '../../uploads/kyc');
  const name = `9-document-${Date.now()}-test.png`;
  let server; let base;

  beforeAll(async () => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), 'png-bytes');
    const app = express();
    app.use('/api/files', filesRoutes);
    await new Promise((resolve) => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}/api/files/kyc/${name}`;
  });

  afterAll(() => { server.close(); fs.rmSync(path.join(dir, name), { force: true }); });

  test('needs a token', async () => {
    expect((await fetch(base)).status).toBe(401);
  });

  test('serves the file to its owner', async () => {
    const response = await fetch(base, { headers: { Authorization: tokenFor(9) } });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('png-bytes');
  });

  test('hides the file from other users', async () => {
    db.execute.mockResolvedValueOnce({ rows: [{ role: 'user' }] });
    expect((await fetch(base, { headers: { Authorization: tokenFor(3) } })).status).toBe(404);
  });

  test('serves the file to an admin', async () => {
    db.execute.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
    expect((await fetch(base, { headers: { Authorization: tokenFor(1) } })).status).toBe(200);
  });
});

describe('verifyWhatsAppWebhook', () => {
  const original = { ...process.env };
  afterEach(() => { process.env = { ...original }; });
  const req = (overrides) => ({ get: (h) => overrides.headers?.[h.toLowerCase()], query: {}, ip: '1.2.3.4', ...overrides });

  test('stays closed when no secret is configured', () => {
    delete process.env.WHATSAPP_WEBHOOK_SECRET;
    const response = res(); const next = jest.fn();
    verifyWhatsAppWebhook(req({}), response, next);
    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(503);
  });

  test('rejects a wrong secret and accepts the right one', () => {
    process.env.WHATSAPP_WEBHOOK_SECRET = 's3cret-value';
    const bad = res(); const next = jest.fn();
    verifyWhatsAppWebhook(req({ query: { token: 'guess' } }), bad, next);
    expect(bad.status).toHaveBeenCalledWith(401);
    verifyWhatsAppWebhook(req({ headers: { 'x-webhook-secret': 's3cret-value' } }), res(), next);
    verifyWhatsAppWebhook(req({ query: { token: 's3cret-value' } }), res(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  test('checks the Twilio signature', () => {
    process.env.WHATSAPP_PROVIDER = 'twilio';
    process.env.TWILIO_AUTH_TOKEN = 'twilio-token';
    const rawBody = 'From=whatsapp%3A%2B258840000000&Body=ola';
    const url = 'https://api.example.com/api/whatsapp/webhook';
    const expected = crypto.createHmac('sha1', 'twilio-token')
      .update(`${url}Bodyola` + 'Fromwhatsapp:+258840000000').digest('base64');
    expect(twilioSignature('twilio-token', url, rawBody)).toBe(expected);

    const base = { protocol: 'https', originalUrl: '/api/whatsapp/webhook', rawBody };
    const next = jest.fn();
    const good = req({ ...base, headers: { host: 'api.example.com', 'x-twilio-signature': expected } });
    verifyWhatsAppWebhook(good, res(), next);
    expect(next).toHaveBeenCalledTimes(1);
    const forged = res();
    verifyWhatsAppWebhook(req({ ...base, headers: { host: 'api.example.com', 'x-twilio-signature': 'forged' } }), forged, next);
    expect(forged.status).toHaveBeenCalledWith(401);
  });
});

describe('upload filter', () => {
  const { createUploader, handleUploadErrors, DOCUMENT_TYPES } = require('../utils/uploads');
  let server; let url;

  beforeAll(async () => {
    const app = express();
    const upload = createUploader('kyc', DOCUMENT_TYPES);
    app.post('/up', (req, _res, next) => { req.user = { id: 5 }; next(); },
      handleUploadErrors(upload.single('document')),
      (req, response) => { fs.rmSync(req.file.path, { force: true }); response.json({ name: req.file.filename }); });
    await new Promise((resolve) => { server = app.listen(0, resolve); });
    url = `http://127.0.0.1:${server.address().port}/up`;
  });
  afterAll(() => server.close());

  const send = (type, filename) => {
    const form = new FormData();
    form.append('document', new Blob(['x'], { type }), filename);
    return fetch(url, { method: 'POST', body: form });
  };

  test('refuses HTML', async () => {
    expect((await send('text/html', 'page.html')).status).toBe(400);
  });

  test('names the file from its type, not the original name', async () => {
    const response = await send('image/png', 'evil.html');
    expect(response.status).toBe(200);
    expect((await response.json()).name).toMatch(/^5-document-\d+-[a-f0-9]{24}\.png$/);
  });
});
