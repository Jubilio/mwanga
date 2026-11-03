const express = require('express');

// In-memory stand-in for the idempotency_keys table.
const mockStore = new Map();
jest.mock('../config/db', () => ({
  db: {
    execute: jest.fn(async ({ sql, args }) => {
      const upd = sql.startsWith('UPDATE'); const id = `${args[upd ? 2 : 0]}:${args[upd ? 3 : 1]}`;
      if (sql.startsWith('INSERT INTO idempotency_keys')) {
        if (mockStore.has(id)) return { rows: [], rowCount: 0 };
        mockStore.set(id, { method: args[2], path: args[3], status_code: null, response: null, stale: false });
        return { rows: [{ idem_key: args[1] }], rowCount: 1 };
      }
      if (sql.startsWith('SELECT')) return { rows: mockStore.has(id) ? [mockStore.get(id)] : [], rowCount: mockStore.has(id) ? 1 : 0 };
      if (sql.startsWith('UPDATE idempotency_keys')) {
        const row = mockStore.get(id);
        if (row) Object.assign(row, { status_code: args[0], response: JSON.parse(args[1]) });
        return { rows: [], rowCount: row ? 1 : 0 };
      }
      if (sql.startsWith('DELETE FROM idempotency_keys WHERE household_id')) {
        mockStore.delete(id);
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }),
  },
}));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const { idempotency } = require('../middleware/idempotency.middleware');

function buildApp(handler) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.user = { householdId: Number(req.get('x-household') || 1) }; next(); });
  app.use(idempotency());
  app.post('/pay/:id', handler);
  return app;
}

const flush = () => new Promise(resolve => setTimeout(resolve, 20));

// Small stand-in for supertest: listens on a free port and sends one POST.
function request(app) {
  return {
    post(path) {
      const headers = { 'Content-Type': 'application/json' };
      const chain = {
        set(name, value) { headers[name] = value; return chain; },
        async send(body) {
          const server = app.listen(0);
          await new Promise(resolve => server.once('listening', resolve));
          try {
            const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
            const text = await res.text();
            return { status: res.status, body: text ? JSON.parse(text) : null, headers: Object.fromEntries(res.headers) };
          } finally {
            server.close();
          }
        },
      };
      return chain;
    },
  };
}

beforeEach(() => mockStore.clear());

describe('idempotency middleware', () => {
  it('runs a write once and replays the first answer for the same key', async () => {
    const handler = jest.fn((req, res) => res.status(201).json({ id: 42 }));
    const app = buildApp(handler);

    const first = await request(app).post('/pay/1').set('Idempotency-Key', 'key-00000001').send({});
    await flush();
    const second = await request(app).post('/pay/1').set('Idempotency-Key', 'key-00000001').send({});

    expect(handler).toHaveBeenCalledTimes(1);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual({ id: 42 });
    expect(second.headers['idempotent-replayed']).toBe('true');
  });

  it('answers 409 while the first request with the key is still running', async () => {
    mockStore.set('1:key-00000002', { method: 'POST', path: '/pay/1', status_code: null, response: null, stale: false });
    const handler = jest.fn((req, res) => res.json({ ok: true }));
    const res = await request(buildApp(handler)).post('/pay/1').set('Idempotency-Key', 'key-00000002').send({});
    expect(res.status).toBe(409);
    expect(handler).not.toHaveBeenCalled();
  });

  it('lets a failed write be tried again with the same key', async () => {
    let calls = 0;
    const app = buildApp((req, res) => { calls += 1; return calls === 1 ? res.status(500).json({ error: 'x' }) : res.json({ ok: true }); });
    await request(app).post('/pay/1').set('Idempotency-Key', 'key-00000003').send({});
    await flush();
    const retry = await request(app).post('/pay/1').set('Idempotency-Key', 'key-00000003').send({});
    expect(calls).toBe(2);
    expect(retry.status).toBe(200);
  });

  it('keeps keys separate per household', async () => {
    const handler = jest.fn((req, res) => res.json({ ok: true }));
    const app = buildApp(handler);
    await request(app).post('/pay/1').set('Idempotency-Key', 'key-00000004').set('x-household', '1').send({});
    await flush();
    await request(app).post('/pay/1').set('Idempotency-Key', 'key-00000004').set('x-household', '2').send({});
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('refuses a key reused for a different request', async () => {
    mockStore.set('1:key-00000005', { method: 'POST', path: '/pay/2', status_code: 200, response: {}, stale: false });
    const res = await request(buildApp((req, r) => r.json({}))).post('/pay/1').set('Idempotency-Key', 'key-00000005').send({});
    expect(res.status).toBe(422);
  });

  it('rejects malformed keys and ignores requests without a key', async () => {
    const handler = jest.fn((req, res) => res.json({ ok: true }));
    const app = buildApp(handler);
    expect((await request(app).post('/pay/1').set('Idempotency-Key', 'bad key!').send({})).status).toBe(400);
    expect((await request(app).post('/pay/1').send({})).status).toBe(200);
  });
});
