const { hintEmail, hintPhone, safeRequestPath } = require('../utils/privacyMask');

jest.mock('../utils/logger', () => ({ error: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn() }));
const logger = require('../utils/logger');
const errorHandler = require('../middleware/error.middleware');

describe('log hints', () => {
  test('never keep the full email or phone number', () => {
    expect(hintEmail('jubilio@gmail.com')).toBe('j***@gmail.com');
    expect(hintEmail('not-an-email')).toBe('[email]');
    expect(hintPhone('+258 84 123 4567')).toBe('***4567');
    expect(hintPhone('')).toBe('[telefone]');
  });

  test('request paths drop the query string', () => {
    expect(safeRequestPath({ originalUrl: '/api/whatsapp/webhook?token=s3cret' })).toBe('/api/whatsapp/webhook');
    expect(safeRequestPath({ url: '/api/ai-connect/openrouter/callback?code=abc' })).toBe('/api/ai-connect/openrouter/callback');
  });
});

describe('error handler', () => {
  const run = (env, err) => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = env;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(err, { method: 'POST', originalUrl: '/api/whatsapp/webhook?token=s3cret' }, res, jest.fn());
    process.env.NODE_ENV = previous;
    return res.json.mock.calls[0][0];
  };

  test('hides internal details from clients in production', () => {
    const body = run('production', new Error('relation "users" does not exist'));
    expect(body.message).not.toMatch(/relation|users/);
    expect(body.stack).toBeUndefined();
  });

  test('keeps the message of client errors (4xx)', () => {
    const err = Object.assign(new Error('Pedido inválido'), { statusCode: 400 });
    expect(run('production', err).message).toBe('Pedido inválido');
  });

  test('does not log the query string', () => {
    logger.error.mockClear();
    run('production', new Error('boom'));
    expect(logger.error.mock.calls[0][0]).not.toContain('s3cret');
  });
});
