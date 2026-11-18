const express = require('express');
const http = require('http');

jest.mock('../utils/sentry', () => ({ captureException: jest.fn(), initSentry: jest.fn(), flushSentry: jest.fn() }));
jest.mock('../config/db', () => ({ db: { execute: jest.fn() }, pool: {} }));

const { captureException } = require('../utils/sentry');
const { runExclusive, lockKey } = require('../utils/jobLock');
const { requestLog } = require('../middleware/requestLog.middleware');
const errorHandler = require('../middleware/error.middleware');

function fakePool(locked) {
  const queries = [];
  const client = {
    query: jest.fn(async (sql) => {
      queries.push(sql);
      if (sql.includes('pg_try_advisory_xact_lock')) return { rows: [{ locked }] };
      return { rows: [] };
    }),
    release: jest.fn(),
  };
  return { pool: { connect: jest.fn(async () => client) }, client, queries };
}

function request(app, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      http.get({ port, path, headers, agent: false }, (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => { server.close(); resolve({ status: res.statusCode, headers: res.headers, body: body ? JSON.parse(body) : null }); });
      }).on('error', (e) => { server.close(); reject(e); });
    });
  });
}

describe('runExclusive (scheduled jobs run on one instance only)', () => {
  it('runs the job inside a transaction holding the advisory lock', async () => {
    const { pool, client, queries } = fakePool(true);
    const work = jest.fn(async () => 'done');

    const out = await runExclusive('advisor-sweep', work, { pool });

    expect(out).toEqual({ ran: true, result: 'done' });
    expect(work).toHaveBeenCalledTimes(1);
    expect(queries[0]).toBe('BEGIN');
    expect(queries).toContain('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('skips the job when another instance holds the lock', async () => {
    const { pool, client, queries } = fakePool(false);
    const work = jest.fn();

    const out = await runExclusive('advisor-sweep', work, { pool });

    expect(out).toEqual({ ran: false });
    expect(work).not.toHaveBeenCalled();
    expect(queries).toContain('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });

  it('releases the connection and rethrows when the job fails', async () => {
    const { pool, client } = fakePool(true);
    await expect(runExclusive('x', async () => { throw new Error('boom'); }, { pool })).rejects.toThrow('boom');
    expect(client.release).toHaveBeenCalled();
  });

  it('skips quietly when the database is unreachable', async () => {
    const pool = { connect: jest.fn(async () => { throw new Error('offline'); }) };
    await expect(runExclusive('x', jest.fn(), { pool })).resolves.toEqual({ ran: false });
  });

  it('gives each job name a stable, distinct key', () => {
    expect(lockKey('advisor-sweep')).toBe(lockKey('advisor-sweep'));
    expect(lockKey('advisor-sweep')).not.toBe(lockKey('notification-decision-engine'));
  });
});

describe('request id and error responses', () => {
  const buildApp = () => {
    const app = express();
    app.use(requestLog);
    app.get('/ok', (req, res) => res.json({ id: req.id }));
    app.get('/boom', () => { throw new Error('SELECT secret FROM internals'); });
    app.get('/bad', (req, res, next) => next(Object.assign(new Error('Pedido inválido'), { statusCode: 400 })));
    app.use(errorHandler);
    return app;
  };

  beforeEach(() => captureException.mockClear());

  it('returns an X-Request-Id on every response', async () => {
    const res = await request(buildApp(), '/ok');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.id).toBe(res.headers['x-request-id']);
  });

  it('keeps a well-formed incoming request id and rejects a malformed one', async () => {
    const kept = await request(buildApp(), '/ok', { 'x-request-id': 'abc123-def456' });
    expect(kept.headers['x-request-id']).toBe('abc123-def456');
    const replaced = await request(buildApp(), '/ok', { 'x-request-id': 'bad id <script>' });
    expect(replaced.headers['x-request-id']).not.toBe('bad id <script>');
  });

  it('reports a 500 to Sentry and hides internals in production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(buildApp(), '/boom');
      expect(res.status).toBe(500);
      expect(res.body.message).not.toMatch(/SELECT/);
      expect(res.body.requestId).toBe(res.headers['x-request-id']);
      expect(res.body.stack).toBeUndefined();
      expect(captureException).toHaveBeenCalledTimes(1);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it('does not report 4xx errors to Sentry', async () => {
    const res = await request(buildApp(), '/bad');
    expect(res.status).toBe(400);
    expect(captureException).not.toHaveBeenCalled();
  });
});

describe('validation errors carry details (zod 4 uses .issues)', () => {
  it('returns the failing field in details', async () => {
    jest.resetModules();
    jest.doMock('../services/transaction.service', () => ({ createTransaction: jest.fn() }));
    jest.doMock('../services/smsQuota.service', () => ({ isSmsNote: () => false, assertSmsQuota: jest.fn() }));
    const { createTransaction } = require('../controllers/transaction.controller');
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await createTransaction({ body: { type: 'despesa' }, user: { id: 1, householdId: 1 } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    const payload = res.json.mock.calls[0][0];
    expect(Array.isArray(payload.details)).toBe(true);
    expect(payload.details.length).toBeGreaterThan(0);
    expect(payload.details[0]).toHaveProperty('message');
  });
});
