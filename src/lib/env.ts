import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_URL: z.url().refine(value => {
    const url = new URL(value);
    return url.origin === value && (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)));
  }),
  AUTH_SECRET: z.string().min(32),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  TOKEN_ENCRYPTION_KEY: z.string().refine(value => Buffer.from(value, 'base64').length === 32),
});

export function configured() { return schema.safeParse(process.env).success; }
export function env() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) throw new Error('Сервіси ще не налаштовані. Перевірте серверні environment variables.');
  return parsed.data;
}
