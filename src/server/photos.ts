import sharp from 'sharp';
import { db } from './db';
import { resolveBox, type Access } from './access';
import { AppError } from './errors';
import { ensureFolder, readDrive, reserveDriveId, trashDrive, uploadDrive } from './drive';
import { slug } from '@/lib/transliteration';

export async function normalizePhoto(bytes: Buffer) {
  if (!bytes.length || bytes.length > 1500000) throw new AppError(413, 'Фото має бути до 1,5 МБ після стиснення.');
  try {
    const image = sharp(bytes, { limitInputPixels: 20000000, animated: false });
    const info = await image.metadata();
    if (!['jpeg','png','webp'].includes(info.format || '')) throw new Error();
    return await image.rotate().resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#fff' }).jpeg({ quality: 82 }).toBuffer();
  } catch { throw new AppError(400, 'Не вдалося прочитати зображення. Виберіть JPEG, PNG або WebP.'); }
}
export async function uploadPhoto(access: Access, id: string, title: string, bytes: Buffer) {
  const box = await db.$transaction(tx => resolveBox(tx, access, true));
  const normalized = await normalizePhoto(bytes);
  const old = await db.media.findUnique({ where: { id } });
  if (old) {
    if (old.boxId !== box.id) throw new AppError(404, 'Фото не знайдено.');
    if (old.status === 'READY' && !old.deletionRequestedAt) return { id };
    throw new AppError(409, 'Попереднє фото ще обробляється або не збереглося. Виберіть його повторно.');
  }
  await db.media.create({ data: { id, boxId: box.id, filename: `${slug(title)}_${id}.jpg`, bytes: normalized.length } });
  let fileId: string | undefined;
  try {
    const folderId = await ensureFolder(box.ownerId);
    fileId = await reserveDriveId(box.ownerId);
    await db.media.update({ where: { id }, data: { driveFileId: fileId } });
    await uploadDrive(box.ownerId, fileId, folderId, `${slug(title)}_${id}.jpg`, normalized);
    await db.$transaction(async tx => {
      await resolveBox(tx, access, true, true); // Recheck revocation while upload was running.
      await tx.media.update({ where: { id }, data: { status: 'READY' } });
    });
    return { id };
  } catch (error) {
    await db.media.update({ where: { id }, data: { status: 'FAILED' } });
    if (fileId) { try { await trashDrive(box.ownerId, fileId); } catch { /* Durable row enables a later cleanup retry. */ } }
    throw error;
  }
}
export async function servePhoto(access: Access, itemId: string) {
  const { box, photo } = await db.$transaction(async tx => {
    const box = await resolveBox(tx, access);
    const item = await tx.item.findFirst({ where: { id: itemId, boxId: box.id, ...(access.kind === 'guest' ? { deletedAt: null } : {}) }, include: { photo: true } });
    if (!item?.photo?.driveFileId || item.photo.status !== 'READY') throw new AppError(404, 'Фото не знайдено.');
    return { box, photo: item.photo };
  });
  const result = await readDrive(box.ownerId, photo.driveFileId!);
  await db.$transaction(tx => resolveBox(tx, access));
  return new Response(result.body, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex', 'Content-Disposition': 'inline' } });
}
