jest.mock('axios', () => ({ post: jest.fn() }));
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    setCredentials: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue({ token: 'access-123' }),
  })),
}));

let axios;

function load(env) {
  jest.resetModules();
  for (const key of ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM']) delete process.env[key];
  Object.assign(process.env, env);
  const service = require('../services/email.service');
  axios = require('axios');
  return service;
}

describe('email service', () => {
  test('sends through the Gmail API over HTTPS when GMAIL_* is set', async () => {
    const service = load({ GMAIL_CLIENT_ID: 'id', GMAIL_CLIENT_SECRET: 'secret', GMAIL_REFRESH_TOKEN: 'refresh', EMAIL_FROM: 'nexovibecontact@gmail.com' });
    axios.post.mockResolvedValueOnce({ data: { id: 'gmail-1' } });
    expect(service.mode).toBe('gmail');
    expect(service.isConfigured()).toBe(true);

    const result = await service.send({ to: 'ana@example.com', subject: 'Olá', text: 'Corpo', html: '<p>Corpo</p>', headers: { 'List-Unsubscribe': '<https://x/u>' } });
    expect(result).toEqual({ messageId: 'gmail-1' });

    const [url, body, options] = axios.post.mock.calls[0];
    expect(url).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    expect(options.headers.Authorization).toBe('Bearer access-123');
    const raw = Buffer.from(body.raw, 'base64url').toString();
    expect(raw).toContain('To: ana@example.com');
    expect(raw).toContain('nexovibecontact@gmail.com');
    expect(raw).toContain('List-Unsubscribe: <https://x/u>');
  });

  test('turns a Gmail API error into a readable message', async () => {
    const service = load({ GMAIL_CLIENT_ID: 'id', GMAIL_CLIENT_SECRET: 'secret', GMAIL_REFRESH_TOKEN: 'refresh' });
    axios.post.mockRejectedValueOnce({ response: { data: { error: { message: 'Insufficient Permission' } } } });
    await expect(service.send({ to: 'a@b.co', subject: 's', text: 't' })).rejects.toThrow('Insufficient Permission');
  });

  test('is not configured without GMAIL_* or EMAIL_* variables', () => {
    const service = load({});
    expect(service.mode).toBe('log');
    expect(service.isConfigured()).toBe(false);
  });
});
