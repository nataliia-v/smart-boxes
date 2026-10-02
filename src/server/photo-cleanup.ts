import { db } from './db';
import { deleteDrive } from './drive';

/** The durable flag is written in the same transaction that detaches the photo. */
export async function deleteQueuedPhoto(id: string): Promise<boolean> {
  try {
    const snapshot = await db.media.findUnique({ where: { id } });
    if (!snapshot) return true;
    return await db.$transaction(async tx => {
      // Same lock order as item saves and restores.
      await tx.$queryRaw`SELECT id FROM "Box" WHERE id = ${snapshot.boxId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Media" WHERE id = ${id} FOR UPDATE`;
      const photo = await tx.media.findUnique({ where: { id }, include: { item: true, box: true } });
      if (!photo) return true;
      if (photo.item || !photo.deletionRequestedAt) return false;
      if (photo.driveFileId) await deleteDrive(photo.box.ownerId, photo.driveFileId);
      await tx.media.delete({ where: { id } });
      return true;
    }, { timeout: 60000, maxWait: 10000 });
  } catch {
    // Keep the record so a later request or the cleanup script can retry safely.
    return false;
  }
}

export async function retryPhotoDeletions(ownerId?: string, limit = 2) {
  const photos = await db.media.findMany({
    where: { deletionRequestedAt: { not: null }, ...(ownerId ? { box: { ownerId } } : {}) },
    select: { id: true }, orderBy: { updatedAt: 'asc' }, take: limit,
  });
  for (const photo of photos) await deleteQueuedPhoto(photo.id);
}
