import * as crypto from 'crypto';

/**
 * Returns the encryption key as a Buffer, derived from the environment variable.
 * Throws an error if the secret is not set.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.CREDENTIAL_SECRET;
  if (!secret) {
    throw new Error('[credential-encryptor] CREDENTIAL_SECRET is not set in environment!');
  }
  // Always expect a hex string for maximal entropy
  return Buffer.from(secret, 'hex');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard for secure nonces

export interface EncryptedPayload {
  encrypted: string; // Hex-encoded encrypted data
  iv: string;        // Hex-encoded initialisation vector (nonce)
  tag: string;       // Hex-encoded authentication tag
}

/**
 * Encrypts the given plaintext with AES-256-GCM using a random IV.
 * Returns the encrypted data, IV, and authentication tag (all as hex strings).
 */
export function encrypt(plaintext: string): EncryptedPayload {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypts the payload previously produced by `encrypt`.
 * Throws if authentication fails or if any field is missing or invalid.
 */
export function decrypt(payload: EncryptedPayload): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(payload.iv, 'hex');
  const tag = Buffer.from(payload.tag, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encrypted, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
