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
