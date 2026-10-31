process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.PUBLIC_API_URL = 'https://api.example.com/';
jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
jest.mock('../services/email.service', () => ({
  isConfigured: jest.fn(() => true),
  fromAddress: jest.fn(() => 'nexovibecontact@gmail.com'),
  send: jest.fn(),
}));

const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');
const emailService = require('../services/email.service');
const campaigns = require('../services/emailCampaign.service');

beforeEach(() => jest.clearAllMocks());

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function request(server, method, path, { headers = {}, body } = {}) {
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html */ }
  return { status: response.status, text, json };
}

describe('unsubscribe tokens', () => {
  test('accept the token made for the same user only', () => {
    const token = campaigns.unsubscribeToken(42);
    expect(campaigns.verifyUnsubscribeToken(42, token)).toBe(true);
    expect(campaigns.verifyUnsubscribeToken(43, token)).toBe(false);
    expect(campaigns.verifyUnsubscribeToken(42, 'x')).toBe(false);
    expect(campaigns.verifyUnsubscribeToken(42, undefined)).toBe(false);
  });

  test('builds the link from the public API URL', () => {
    expect(campaigns.unsubscribeUrl(7)).toBe(`https://api.example.com/api/email/unsubscribe?u=7&t=${campaigns.unsubscribeToken(7)}`);
  });
});

describe('content', () => {
  test('undoes the request sanitizer escape and validates length', () => {
    expect(campaigns.validateContent({ subject: 'A &lt; B', body: 'x &amp; y' })).toEqual({ subject: 'A < B', body: 'x & y' });
    expect(campaigns.validateContent({ subject: '', body: 'x' }).error).toBeTruthy();
    expect(campaigns.validateContent({ subject: 'a'.repeat(151), body: 'x' }).error).toBeTruthy();
    expect(campaigns.validateContent({ subject: 'Linha\r\nnova', body: 'x' }).subject).toBe('Linha nova');
  });

  test('escapes HTML, personalises and adds unsubscribe link and headers', () => {
    const message = campaigns.renderEmail({
      subject: 'Olá {nome}',
      body: 'Olá {nome},\n\n<script>alert(1)</script> veja https://mwanga.app.',
      name: 'Ana Maria',
      userId: 5,
    });
    expect(message.subject).toBe('Olá Ana');
    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.html).toContain('<a href="https://mwanga.app"');
    expect(message.html).toContain(campaigns.unsubscribeUrl(5));
    expect(message.text).toContain(campaigns.unsubscribeUrl(5));
    expect(message.headers['List-Unsubscribe']).toBe(`<${campaigns.unsubscribeUrl(5)}>`);
    expect(message.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });
});

describe('public unsubscribe routes', () => {
  let server;
  beforeAll(async () => {
    const app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/email', require('../routes/email.routes'));
    server = await listen(app);
  });
  afterAll(() => server.close());

  test('rejects a forged link', async () => {
    const res = await request(server, 'POST', '/api/email/unsubscribe?u=5&t=forged');
    expect(res.status).toBe(400);
    expect(db.execute).not.toHaveBeenCalled();
  });

  test('GET only shows a confirmation page', async () => {
    const res = await request(server, 'GET', `/api/email/unsubscribe?u=5&t=${campaigns.unsubscribeToken(5)}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('cancelar subscrição');
    expect(db.execute).not.toHaveBeenCalled();
  });

  test('POST opts the user out', async () => {
    db.execute.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const res = await request(server, 'POST', `/api/email/unsubscribe?u=5&t=${campaigns.unsubscribeToken(5)}`);
    expect(res.status).toBe(200);
    expect(db.execute).toHaveBeenCalledWith(expect.objectContaining({
      sql: expect.stringContaining('email_opt_out = ?'),
      args: [true, expect.any(Date), 5],
    }));
  });
});

describe('admin email routes', () => {
  let server;
  const token = (id) => `Bearer ${jwt.sign({ id, householdId: 1 }, process.env.JWT_SECRET)}`;
  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', require('../routes/admin.routes'));
    server = await listen(app);
  });
  afterAll(() => server.close());

  test('a non-admin cannot send', async () => {
    db.execute.mockResolvedValueOnce({ rows: [{ role: 'user' }] });
    const res = await request(server, 'POST', '/api/admin/emails/campaigns', {
      headers: { Authorization: token(9) }, body: { subject: 'Oi', body: 'Teste' },
    });
    expect(res.status).toBe(403);
    expect(emailService.send).not.toHaveBeenCalled();
  });

  test('refuses a second campaign while one is sending', async () => {
    db.execute
      .mockResolvedValueOnce({ rows: [{ role: 'admin' }] })
      .mockResolvedValueOnce({ rows: [{ id: 3 }] });
    const res = await request(server, 'POST', '/api/admin/emails/campaigns', {
      headers: { Authorization: token(1) }, body: { subject: 'Oi', body: 'Teste' },
    });
    expect(res.status).toBe(409);
  });

  test('refuses to send when SMTP is not configured', async () => {
    emailService.isConfigured.mockReturnValueOnce(false);
    db.execute.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });
    const res = await request(server, 'POST', '/api/admin/emails/test', {
      headers: { Authorization: token(1) }, body: { subject: 'Oi', body: 'Teste' },
    });
    expect(res.status).toBe(503);
  });
});

describe('processCampaign', () => {
  test('sends pending recipients, skips opted-out ones and finishes', async () => {
    process.env.EMAIL_BATCH_DELAY_MS = '1';
    const calls = [];
    db.execute.mockImplementation(async ({ sql, args }) => {
      calls.push(sql);
      if (sql.startsWith('SELECT status FROM email_campaigns')) return { rows: [{ status: 'sending' }] };
      if (sql.includes("COUNT(*) AS count FROM email_campaign_recipients")) return { rows: [{ count: 0 }] };
      if (sql.includes('FROM email_campaign_recipients r')) {
        const done = calls.filter((s) => s.includes('FROM email_campaign_recipients r')).length > 1;
        return { rows: done ? [] : [
          { user_id: 1, email: 'a@x.com', name: 'Ana', opted_out: false },
          { user_id: 2, email: 'b@x.com', name: 'Beto', opted_out: true },
        ] };
      }
      if (sql.startsWith('SELECT subject, body')) return { rows: [{ subject: 'Oi', body: 'Olá {nome}' }] };
      return { rows: [], rowCount: 1, args };
    });
    await campaigns.processCampaign(11);
    expect(emailService.send).toHaveBeenCalledTimes(1);
    expect(emailService.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@x.com', subject: 'Oi' }));
    expect(db.execute).toHaveBeenCalledWith(expect.objectContaining({ args: ['skipped', null, 11, 2] }));
    expect(calls.some((s) => s.includes("status = 'sent', finished_at"))).toBe(true);
    db.execute.mockReset();
  });
});
