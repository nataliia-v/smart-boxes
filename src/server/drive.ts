import { db } from './db';
import { decrypt, encrypt } from './crypto';
import { env } from '@/lib/env';
import { AppError } from './errors';

const ROOT = 'https://www.googleapis.com/drive/v3';
export async function driveToken(userId: string) {
  const account = await db.account.findFirst({ where: { userId, provider: 'google' } });
  if (!account?.refresh_token || !account.scope?.split(' ').includes('https://www.googleapis.com/auth/drive.file')) {
    await db.user.update({ where: { id: userId }, data: { driveStatus: 'NEEDS_ATTENTION' } });
    throw new AppError(503, 'Доступ до фото тимчасово недоступний. Власнику потрібно повторно підключити Google.');
  }
  if (account.access_token && (account.expires_at || 0) > Date.now()/1000+60) return decrypt(account.access_token);
  // A DB advisory lock coordinates refreshes across serverless instances.
  try { return await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))::text`;
    const fresh = await tx.account.findUniqueOrThrow({ where: { id: account.id } });
    if (fresh.access_token && (fresh.expires_at || 0) > Date.now()/1000+60) return decrypt(fresh.access_token);
    const result = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(10000), body: new URLSearchParams({
      client_id: env().AUTH_GOOGLE_ID, client_secret: env().AUTH_GOOGLE_SECRET,
      grant_type: 'refresh_token', refresh_token: decrypt(fresh.refresh_token!),
    }) });
    if (!result.ok) throw new AppError(503, 'Доступ до фото тимчасово недоступний. Власнику потрібно повторно підключити Google.');
    const data = await result.json();
    if (typeof data.access_token !== 'string' || typeof data.expires_in !== 'number') throw new AppError(503, 'Google тимчасово недоступний.');
    await tx.account.update({ where: { id: fresh.id }, data: { access_token: encrypt(data.access_token), expires_at: Math.floor(Date.now()/1000+data.expires_in), ...(data.refresh_token ? { refresh_token: encrypt(data.refresh_token) } : {}) } });
    return data.access_token as string;
  }, { timeout: 20000, maxWait: 10000 });
  } catch (error) {
    await db.user.update({ where: { id: userId }, data: { driveStatus: 'NEEDS_ATTENTION' } });
    throw error;
  }
}
async function drive(userId: string, url: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await driveToken(userId);
  const result = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(20000), headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  if (result.status === 401 && retry) {
    await db.account.updateMany({ where: { userId, provider: 'google' }, data: { expires_at: 0 } });
    return drive(userId, url, init, false);
  }
  if (!result.ok && result.status !== 404) {
    await db.user.update({ where: { id: userId }, data: { driveStatus: 'NEEDS_ATTENTION' } });
    throw new AppError(503, 'Google Drive не прийняв запит. Власнику потрібно перевірити підключення та вільне місце.');
  }
  return result;
}
export async function ensureFolder(userId: string) {
  // Folder creation is idempotent per user even when multiple requests arrive together.
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'folder:'+userId}))::text`;
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    async function exists(id: string | null) {
      if (!id) return false;
      const result = await drive(userId, `${ROOT}/files/${encodeURIComponent(id)}?fields=id,trashed,mimeType`);
      if (result.status === 404) return false;
      const file = await result.json(); return !file.trashed && file.mimeType === 'application/vnd.google-apps.folder';
    }
    async function create(name: string, parent?: string) {
      const result = await drive(userId, `${ROOT}/files?fields=id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', ...(parent ? { parents: [parent] } : {}) }) });
      return (await result.json()).id as string;
    }
    const root = await exists(user.driveRootFolderId) ? user.driveRootFolderId! : await create('Smart Box');
    const photos = root === user.driveRootFolderId && await exists(user.drivePhotosFolderId) ? user.drivePhotosFolderId! : await create('Photos', root);
    await tx.user.update({ where: { id: userId }, data: { driveRootFolderId: root, drivePhotosFolderId: photos, driveStatus: 'CONNECTED' } });
    return photos;
  }, { timeout: 60000, maxWait: 10000 });
}
export async function reserveDriveId(userId: string) {
  const result = await drive(userId, `${ROOT}/files/generateIds?count=1&space=drive&type=files`);
  return (await result.json()).ids[0] as string;
}
export async function uploadDrive(userId: string, fileId: string, folderId: string, filename: string, bytes: Buffer) {
  const boundary = 'smartbox_' + crypto.randomUUID();
  const prefix = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ id: fileId, name: filename, parents: [folderId] })}\r\n--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`);
  const body = Buffer.concat([prefix, bytes, Buffer.from(`\r\n--${boundary}--`)]);
  const result = await drive(userId, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: new Uint8Array(body) });
  if (result.status === 404) throw new AppError(503, 'Папку Drive видалено. Спробуйте завантажити фото ще раз.');
}
export async function readDrive(userId: string, fileId: string) {
  const result = await drive(userId, `${ROOT}/files/${encodeURIComponent(fileId)}?alt=media`);
  if (result.status === 404) throw new AppError(404, 'Фото видалено з Google Drive.');
  return result;
}
export async function trashDrive(userId: string, fileId: string) {
  await drive(userId, `${ROOT}/files/${encodeURIComponent(fileId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
}

/** Permanent deletion, not Drive trash. Missing files count as already deleted. */
export async function deleteDrive(userId: string, fileId: string) {
  await drive(userId, `${ROOT}/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
}
