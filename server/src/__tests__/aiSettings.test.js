jest.mock('../config/db', () => ({ db: { execute: jest.fn() } }));
const { db } = require('../config/db');
const service = require('../services/aiSettings.service');
const { schema } = require('../controllers/aiSettings.controller');
beforeEach(() => { process.env.AI_CREDENTIALS_ENCRYPTION_KEY = 'ab'.repeat(32); jest.clearAllMocks(); });
afterEach(() => { delete process.env.AI_CREDENTIALS_ENCRYPTION_KEY; delete global.fetch; });
test('encrypts with random IVs and authenticates account, household and provider', () => {
 const a = service.encrypt('secret-api-key', 1, 2, 'groq'), b = service.encrypt('secret-api-key', 1, 2, 'groq');
 expect(JSON.stringify(a)).not.toContain('secret-api-key'); expect(a.iv).not.toBe(b.iv);
 expect(service.decrypt(a, 1, 2)).toBe('secret-api-key');
 expect(() => service.decrypt(a, 1, 3)).toThrow(); expect(() => service.decrypt(a, 3, 2)).toThrow();
 expect(() => service.decrypt({ ...a, provider: 'gemini' }, 1, 2)).toThrow();
});
test('fails closed when encryption configuration is missing', () => { delete process.env.AI_CREDENTIALS_ENCRYPTION_KEY; expect(() => service.encrypt('secret-api-key', 1, 2, 'groq')).toThrow('AI_KEY_STORAGE_UNAVAILABLE'); });
test('status never returns credentials or ciphertext and reads only current user', async () => {
 const record = service.encrypt('secret-api-key', 1, 2, 'groq'); db.execute.mockResolvedValue({ rows: [{ value: JSON.stringify(record) }] });
 const result = await service.status(1, 2); expect(Object.keys(result).sort()).toEqual(['configured', 'provider', 'storageAvailable', 'updatedAt']); expect(db.execute.mock.calls[0][0].args).toEqual([1, 'ai_credentials_2']);
});
test('stores encrypted data and removes only the authenticated user setting', async () => {
 db.execute.mockResolvedValue({ rows: [] }); await service.save(1, 2, 'groq', 'secret-api-key'); expect(db.execute.mock.calls[0][0].args[1]).not.toContain('secret-api-key'); await service.remove(1,2); expect(db.execute.mock.calls[1][0].args).toEqual([1,'ai_credentials_2']);
});
test('test only calls a fixed provider endpoint without financial data or generation', async () => {
 global.fetch = jest.fn().mockResolvedValue({ ok: true, body: { cancel: jest.fn() } }); await service.test('groq','secret-api-key'); expect(fetch.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/models'); expect(fetch.mock.calls[0][1].body).toBeUndefined();
});
test('provider errors never expose echoed secrets', async () => { global.fetch = jest.fn().mockRejectedValue(new Error('secret-api-key')); await expect(service.test('groq','secret-api-key')).rejects.toThrow('AI_PROVIDER_UNAVAILABLE'); });
test('rejects custom URLs, user spoofing and newline credentials', () => { expect(schema.safeParse({provider:'https://evil.test',apiKey:'secret-api-key'}).success).toBe(false); expect(schema.safeParse({provider:'groq',apiKey:'secret-api-key',userId:3}).success).toBe(false); expect(schema.safeParse({provider:'groq',apiKey:'secret\napi-key'}).success).toBe(false); });

describe('Ligar com OpenRouter (PKCE)', () => {
  const crypto = require('crypto');
  const { callbackOpenRouter } = require('../controllers/aiSettings.controller');
  function pendingRowFor(start) {
    const insert = db.execute.mock.calls.find(([q]) => q.sql.startsWith('INSERT'))[0];
    return { key: insert.args[0], value: insert.args[1] };
  }
  test('start builds an S256 authorization URL and keeps the verifier server-side', async () => {
    db.execute.mockResolvedValue({ rows: [] });
    const { url } = await service.startOpenRouterConnect(1, 2, 'https://api.test/api/ai-connect/openrouter/callback', 'app');
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe('https://openrouter.ai/auth');
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
    expect(parsed.searchParams.get('callback_url')).toBe('https://api.test/api/ai-connect/openrouter/callback');
    const row = pendingRowFor();
    const stored = JSON.parse(row.value);
    expect(url).not.toContain(stored.verifier);
    expect(parsed.searchParams.get('code_challenge')).toBe(crypto.createHash('sha256').update(stored.verifier).digest('base64url'));
    expect(row.key).not.toContain(parsed.searchParams.get('state'));
    expect(stored).toMatchObject({ userId: 2, returnTo: 'app' });
  });
  test('start fails closed without the encryption key', async () => {
    delete process.env.AI_CREDENTIALS_ENCRYPTION_KEY;
    await expect(service.startOpenRouterConnect(1, 2, 'https://x/cb')).rejects.toThrow('AI_KEY_STORAGE_UNAVAILABLE');
    expect(db.execute).not.toHaveBeenCalled();
  });
  test('complete exchanges the code once and stores the key encrypted for the right user', async () => {
    db.execute.mockResolvedValue({ rows: [] });
    const { url } = await service.startOpenRouterConnect(1, 2, 'https://x/cb');
    const state = new URL(url).searchParams.get('state');
    const row = pendingRowFor();
    db.execute.mockReset();
    db.execute.mockResolvedValueOnce({ rows: [{ household_id: 1, value: row.value }] }).mockResolvedValue({ rows: [] });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ key: 'sk-or-user-key-123' }) });
    await expect(service.completeOpenRouterConnect(state, 'auth-code')).resolves.toEqual({ returnTo: 'web' });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(fetch.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/auth/keys');
    expect(body).toEqual({ code: 'auth-code', code_verifier: JSON.parse(row.value).verifier, code_challenge_method: 'S256' });
    const [lookup, del, save] = db.execute.mock.calls.map(c => c[0]);
    expect(lookup.args).toEqual([row.key]);
    expect(del.sql).toMatch(/^DELETE/);
    expect(save.args[0]).toBe('ai_credentials_2');
    expect(save.args[1]).not.toContain('sk-or-user-key-123');
    expect(service.decrypt(JSON.parse(save.args[1]), 1, 2)).toBe('sk-or-user-key-123');
  });
  test('unknown or expired state is rejected without calling OpenRouter', async () => {
    db.execute.mockResolvedValue({ rows: [] });
    global.fetch = jest.fn();
    await expect(service.completeOpenRouterConnect('a'.repeat(43), 'code')).rejects.toThrow('AI_CONNECT_EXPIRED');
    db.execute.mockResolvedValueOnce({ rows: [{ household_id: 1, value: JSON.stringify({ userId: 2, verifier: 'v', expiresAt: Date.now() - 1 }) }] });
    await expect(service.completeOpenRouterConnect('b'.repeat(43), 'code')).rejects.toThrow('AI_CONNECT_EXPIRED');
    expect(fetch).not.toHaveBeenCalled();
  });
  test('callback page never echoes the code or key and handles cancel', async () => {
    const res = { set: jest.fn(), type: jest.fn().mockReturnThis(), send: jest.fn(), redirect: jest.fn() };
    await callbackOpenRouter({ query: {} }, res);
    expect(res.send.mock.calls[0][0]).toContain('Ligação cancelada');
    db.execute.mockResolvedValue({ rows: [] });
    await callbackOpenRouter({ query: { code: 'secret-code', state: 'c'.repeat(43) } }, res);
    expect(res.send.mock.calls[1][0]).toContain('expirou');
    expect(res.send.mock.calls[1][0]).not.toContain('secret-code');
  });
});
