import * as crypto from 'crypto';

// Get AES key from env variable (hex encoded)
function getEncryptionKey(): Buffer {
  const secret = process.env.CREDENTIAL_SECRET;
  if (!secret) {
    throw new Error('[credential-encryptor] CREDENTIAL_SECRET is not set');
  }
  return Buffer.from(secret, 'hex');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // nonce length for GCM

export interface EncryptedPayload {
  encrypted: string; // hex cipher text
  iv: string; // hex nonce
  tag: string; // hex auth tag
}

// Encrypt text with random IV, return cipher text + IV + tag
export function encrypt(plaintext: string): EncryptedPayload {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

// Decrypt payload, verify tag, return plaintext
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
