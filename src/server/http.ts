import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { auth } from '@/auth';
import { configured, env } from '@/lib/env';
import { db } from './db';
import { AppError } from './errors';

export async function owner() {
  const session = await auth();
  if (!session?.user?.id) throw new AppError(401, 'Увійдіть через Google.');
  return session.user.id;
}
export function origin(request: Request) {
  if (request.headers.get('origin') !== new URL(env().APP_URL).origin) throw new AppError(403, 'Запит з іншого сайту відхилено. Оновіть сторінку.');
}
export async function boundedBody(request: Request, max: number) {
  if (Number(request.headers.get('content-length') || 0) > max) throw new AppError(413, 'Файл або запит завеликий.');
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length; if (size > max) { await reader.cancel(); throw new AppError(413, 'Файл або запит завеликий.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export async function jsonBody(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new AppError(415, 'Очікується JSON.');
  try {
    const value = JSON.parse((await boundedBody(request, 20000)).toString());
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AppError(400, 'Очікується JSON-об’єкт.');
    return value;
  }
  catch (error) { if (error instanceof AppError) throw error; throw new AppError(400, 'Некоректний запит.'); }
}
export async function rateLimit(key: string, limit: number, seconds = 60) {
  const hash = createHash('sha256').update(key).digest('hex');
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const row = await db.rateBucket.upsert({ where: { key: `${hash}:${bucket}` }, create: { key: `${hash}:${bucket}`, count: 1, expiresAt: new Date((bucket+1)*seconds*1000) }, update: { count: { increment: 1 } } });
  if (row.count > limit) throw new AppError(429, 'Забагато запитів. Зачекайте й спробуйте ще раз.');
}
export function clientIp(request: Request) {
  return process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown' : 'local';
}
export function response(data: unknown, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } }); }
export async function endpoint(work: () => Promise<Response>) {
  try {
    if (!configured()) throw new AppError(503, 'Сервіси ще не підключені. Адміністратору потрібно завершити налаштування сайту.');
    return await work();
  } catch (error) {
    if (error instanceof AppError) return response({ error: error.message }, error.status);
    if (error instanceof ZodError) return response({ error: 'Перевірте поля форми: назву, довжину тексту та версію запису.' }, 400);
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002','P2034'].includes(error.code)) return response({ error: 'Одночасна зміна. Оновіть список і повторіть запит.' }, 409);
    // Never log request URLs, OAuth responses, tokens or database connection strings.
    console.error('Smart Box request failed', error instanceof Error ? error.name : 'UnknownError');
    return response({ error: 'Не вдалося виконати операцію. Спробуйте ще раз.' }, 500);
  }
}
