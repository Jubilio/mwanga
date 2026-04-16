const cryptoService = require('./crypto.service');

describe('Crypto Service', () => {
  const originalKey = process.env.ENCRYPTION_KEY;
  const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 32 bytes in hex

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it('should encrypt and decrypt a string correctly', () => {
    const plainText = 'Mwanga Financial Secret';
    const encrypted = cryptoService.encrypt(plainText);
    
    expect(encrypted).not.toBe(plainText);
    expect(encrypted).toContain(':');
    
    const decrypted = cryptoService.decrypt(encrypted);
    expect(decrypted).toBe(plainText);
  });

  it('should return null if decryption fails with wrong key', () => {
    const plainText = 'Secret';
    const encrypted = cryptoService.encrypt(plainText);
    
    // Change key temporarily
    process.env.ENCRYPTION_KEY = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    
    const decrypted = cryptoService.decrypt(encrypted);
    expect(decrypted).toBeNull();
    
    // Restore test key
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  it('should handle empty or null values', () => {
    expect(cryptoService.encrypt(null)).toBeNull();
    expect(cryptoService.encrypt('')).toBe('');
    expect(cryptoService.decrypt(null)).toBeNull();
    expect(cryptoService.decrypt('')).toBe('');
  });

  it('should return original text if it is not in encrypted format', () => {
    const notEncrypted = 'plain_text_without_colons';
    expect(cryptoService.decrypt(notEncrypted)).toBe(notEncrypted);
  });
});
