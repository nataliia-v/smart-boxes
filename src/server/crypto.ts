import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
export function publicToken() { return randomBytes(32).toString('base64url'); }
function key() {
  const value = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY || '', 'base64');
  if (value.length !== 32) throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes');
  return value;
}
export function encrypt(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}
export function decrypt(value: string) {
  const [version, iv, tag, data] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Invalid encrypted credential');
  const cipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  cipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([cipher.update(Buffer.from(data, 'base64url')), cipher.final()]).toString('utf8');
}
