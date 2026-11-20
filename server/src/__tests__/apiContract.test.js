process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const jwt = require('jsonwebtoken');

jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
jest.mock('../utils/sentry', () => ({ captureException: jest.fn() }));

const { rateLimitKey } = require('../utils/rateLimitKey');
const errorHandler = require('../middleware/error.middleware');
const { corsOptions } = require('../config/cors');

function runHandler(err) {
  let status; let body;
  const res = { status(s) { status = s; return this; }, json(b) { body = b; return this; } };
  errorHandler(err, { method: 'GET', originalUrl: '/x', id: 'req-1' }, res, () => {});
  return { status, body };
}

describe('rate limit key', () => {
  it('counts signed-in requests per user, not per IP', () => {
    const token = jwt.sign({ id: 12, householdId: 3 }, process.env.JWT_SECRET);
    expect(rateLimitKey({ ip: '41.1.1.1', headers: { authorization: `Bearer ${token}` } })).toBe('user:12');
  });

  it('falls back to the IP for missing, forged or expired tokens', () => {
    const forged = jwt.sign({ id: 12 }, 'other-secret');
    const expired = jwt.sign({ id: 12, exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_SECRET);
    expect(rateLimitKey({ ip: '41.1.1.1', headers: {} })).toBe('ip:41.1.1.1');
    expect(rateLimitKey({ ip: '41.1.1.1', headers: { authorization: `Bearer ${forged}` } })).toBe('ip:41.1.1.1');
    expect(rateLimitKey({ ip: '41.1.1.1', headers: { authorization: `Bearer ${expired}` } })).toBe('ip:41.1.1.1');
  });
});

describe('error format', () => {
  it('always sends error, message and a stable code', () => {
    const { status, body } = runHandler(Object.assign(new Error('Pedido inválido'), { statusCode: 400 }));
    expect(status).toBe(400);
    expect(body).toMatchObject({ code: 'BAD_REQUEST', error: 'Pedido inválido', message: 'Pedido inválido', requestId: 'req-1' });
  });

  it('keeps a code set by the code that threw', () => {
    const { body } = runHandler(Object.assign(new Error('Já pago'), { statusCode: 409, code: 'ALREADY_PAID' }));
    expect(body.code).toBe('ALREADY_PAID');
  });

  it('never exposes the internal code of a 500', () => {
    const { body } = runHandler(Object.assign(new Error('connect failed'), { code: 'ECONNREFUSED' }));
    expect(body.code).toBe('INTERNAL_ERROR');
  });
});

describe('CORS', () => {
  it('lets the web app read the request id and rate limit headers', () => {
    expect(corsOptions.exposedHeaders).toEqual(expect.arrayContaining(['X-Request-Id', 'Retry-After', 'RateLimit-Remaining', 'Idempotent-Replayed']));
  });
});
