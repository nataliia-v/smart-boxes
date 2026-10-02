import { db } from '../src/server/db';
import { trashDrive } from '../src/server/drive';
import { retryPhotoDeletions } from '../src/server/photo-cleanup';

await retryPhotoDeletions(undefined, 100);

// Run with server environment. Retain photos attached to soft-deleted items.
const cutoff = new Date(Date.now() - 24*60*60*1000);
const abandoned = await db.media.findMany({ where: { item: null, deletionRequestedAt: null, updatedAt: { lt: cutoff } }, include: { box: true }, take: 100 });
for (const photo of abandoned) {
  try {
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Box" WHERE id = ${photo.boxId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Media" WHERE id = ${photo.id} FOR UPDATE`;
      const current = await tx.media.findUnique({ where: { id: photo.id }, include: { item: true } });
      if (!current || current.item || current.deletionRequestedAt || current.updatedAt >= cutoff) return;
      if (current.driveFileId) await trashDrive(photo.box.ownerId, current.driveFileId);
      await tx.media.delete({ where: { id: photo.id } });
    }, { timeout: 60000 });
    console.log('Cleaned abandoned upload', photo.id);
  } catch { console.error('Cleanup will need retry', photo.id); }
}
await db.rateBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
await db.$disconnect();
