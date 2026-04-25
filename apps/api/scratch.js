const crypto = require('crypto');
function encrypt(plainText, masterKeyStr) {
  const masterKey = Buffer.from(masterKeyStr.padEnd(32, '0').slice(0, 32), 'utf-8');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return { encryptedValue: encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
}
function decrypt(encryptedValue, ivHex, authTagHex, masterKeyStr) {
  const masterKey = Buffer.from(masterKeyStr.padEnd(32, '0').slice(0, 32), 'utf-8');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const key = 'test-encryption-key-for-aero';
const secret = 'super-secret-database-password';
const { encryptedValue, iv, authTag } = encrypt(secret, key);
console.log('Encrypted:', encryptedValue, iv, authTag);
const decrypted = decrypt(encryptedValue, iv, authTag, key);
console.log('Decrypted:', decrypted);
if (decrypted === secret) console.log('SUCCESS'); else console.error('FAILED');
