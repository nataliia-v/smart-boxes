import type { Box, Prisma } from '@prisma/client';
import { AppError } from './errors';

export type Access = { kind: 'owner'; userId: string; boxId: string } | { kind: 'guest'; token: string };
export function permitted(box: Pick<Box,'ownerId'|'publicToken'|'guestPermission'|'deletedAt'> | null, access: Access, write = false) {
  if (!box || box.deletedAt) throw new AppError(404, 'Коробку не знайдено або доступ відкликано.');
  if (access.kind === 'owner') {
    if (box.ownerId !== access.userId) throw new AppError(404, 'Коробку не знайдено.');
  } else {
    if (box.publicToken !== access.token || box.guestPermission === 'PRIVATE') throw new AppError(404, 'Коробку не знайдено або доступ відкликано.');
    if (write && box.guestPermission !== 'EDIT') throw new AppError(403, 'Власник дозволив лише перегляд цієї коробки.');
  }
}
export async function resolveBox(tx: Prisma.TransactionClient, access: Access, write = false, lock = false) {
  const where = access.kind === 'owner' ? { id: access.boxId } : { publicToken: access.token };
  let box = await tx.box.findUnique({ where });
  permitted(box, access, write);
  if (lock) {
    await tx.$queryRaw`SELECT id FROM "Box" WHERE id = ${box!.id} FOR UPDATE`;
    box = await tx.box.findUnique({ where: { id: box!.id } });
    permitted(box, access, write);
  }
  return box!;
}
export function actor(access: Access) {
  return access.kind === 'owner' ? { actorType: 'OWNER' as const, actorUserId: access.userId } : { actorType: 'GUEST' as const, actorUserId: null };
}
