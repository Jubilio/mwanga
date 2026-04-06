const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is required in environment variables for Application-Level Encryption');
  }
  // Convert 64 char hex string to 32 byte buffer
  return Buffer.from(key, 'hex');
};

/**
 * Encrypts a string using AES-256-GCM
 * @param {string} text - The plain text to encrypt
 * @returns {string} - The encrypted string in format iv:authTag:encryptedText
 */
const encrypt = (text) => {
  if (!text) return text;
  
  const iv = crypto.randomBytes(12); // GCM standard IV size
  const key = getEncryptionKey();
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts a string previously encrypted by encrypt()
 * @param {string} encryptedData - The encrypted string in format iv:authTag:encryptedText
 * @returns {string|null} - The decrypted plain text
 */
const decrypt = (encryptedData) => {
  if (!encryptedData) return encryptedData;
  if (typeof encryptedData !== 'string' || !encryptedData.includes(':')) {
    // If not encrypted or badly formatted, return as is (could be legacy plain text data)
    return encryptedData;
  }

  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return encryptedData;

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    // Be careful not to leak the raw string if decryption fails due to key mismatch.
    // We return a fallback or throw. Let's return null if decryption strictly fails.
    return null;
  }
};

module.exports = {
  encrypt,
  decrypt
};
