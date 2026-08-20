const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV
const TAG_LENGTH = 16; // 128-bit auth tag
const ENCODING = 'hex';

// Fallback 32-byte default key for dev/local testing if env var not set
const DEFAULT_KEY_HEX = 'e1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1e3f5a7b9c1e3f5a7b9c1e3f5a7b9c1e3';

const getKey = () => {
  const keyHex = process.env.DATA_ENCRYPTION_KEY || DEFAULT_KEY_HEX;
  if (!keyHex || keyHex.length < 64) {
    throw new Error('DATA_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).');
  }
  return Buffer.from(keyHex.substring(0, 64), ENCODING);
};

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns: "iv:authTag:encryptedText" (hex encoded)
 */
exports.encrypt = (plaintext) => {
  if (plaintext === null || plaintext === undefined || plaintext === '') return plaintext;

  // Don't re-encrypt if already in encrypted format iv:authTag:cipher
  if (typeof plaintext === 'string' && plaintext.split(':').length === 3) {
    const parts = plaintext.split(':');
    if (parts[0].length === 32 && parts[1].length === 32) {
      return plaintext;
    }
  }

  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted.toString(ENCODING)}`;
};

/**
 * Decrypts a ciphertext string formatted as "iv:authTag:encryptedText".
 */
exports.decrypt = (ciphertext) => {
  if (ciphertext === null || ciphertext === undefined || ciphertext === '') return ciphertext;

  if (typeof ciphertext !== 'string') return ciphertext;

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    // Return as-is if legacy unencrypted plaintext
    return ciphertext;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  if (ivHex.length !== 32 || authTagHex.length !== 32) {
    return ciphertext;
  }

  try {
    const key = getKey();
    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);
    const encryptedText = Buffer.from(encryptedHex, ENCODING);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('[Encryption Utility] Decryption failed:', err.message);
    return '[ENCRYPTED/ERROR]';
  }
};
