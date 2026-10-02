import type { Prisma } from '@prisma/client';
import { db } from './db';
import { actor, resolveBox, type Access } from './access';
import { AppError } from './errors';
import { publicToken } from './crypto';
import { boxInput, boxUpdate, itemInput, versionInput, moveBoxInput } from '@/lib/validation';
import { deleteQueuedPhoto } from './photo-cleanup';

export async function listBoxes(userId: string) {
  const boxes = await db.box.findMany({ where: { ownerId: userId, deletedAt: null }, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }], include: { _count: { select: { items: { where: { deletedAt: null } } } } } });
  return boxes.map(({ _count, ...box }) => ({ ...box, itemCount: _count.items }));
}
export async function createBox(userId: string, raw: unknown) {
  const data = boxInput.parse(raw);
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const old = await tx.box.findUnique({ where: { id: data.id } });
    if (old) {
      if (old.ownerId !== userId || old.deletedAt) throw new AppError(409, 'Повторіть створення коробки.');
      return old;
    }
    const first = await tx.box.aggregate({ where: { ownerId: userId, deletedAt: null }, _min: { position: true } });
    const box = await tx.box.create({ data: { ...data, ownerId: userId, publicToken: publicToken(), position: (first._min.position ?? 1) - 1 } });
    await tx.activity.create({ data: { boxId: box.id, action: 'BOX_CREATED', actorType: 'OWNER', actorUserId: userId } });
    return box;
  });
}
export async function moveBox(userId: string, raw: unknown) {
  const { id, beforeId } = moveBoxInput.parse(raw);
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    const boxes = await tx.box.findMany({ where: { ownerId: userId, deletedAt: null }, orderBy: [{ position: 'asc' }, { createdAt: 'desc' }, { id: 'asc' }], select: { id: true } });
    if (!boxes.some(box => box.id === id) || (beforeId && !boxes.some(box => box.id === beforeId))) throw new AppError(404, 'Коробку не знайдено. Оновіть список.');
    if (id === beforeId) return { saved: true };
    const ordered = boxes.filter(box => box.id !== id);
    ordered.splice(beforeId ? ordered.findIndex(box => box.id === beforeId) : ordered.length, 0, { id });
    for (const [position, box] of ordered.entries()) await tx.box.update({ where: { id: box.id }, data: { position } });
    return { saved: true };
  });
}
export async function detail(access: Access, query = '', page = 1, removed = false, focusItemId?: string) {
  if (removed && access.kind !== 'owner') throw new AppError(403, 'Недоступно.');
  return db.$transaction(async tx => {
    const box = await resolveBox(tx, access);
    const where: Prisma.ItemWhereInput = { boxId: box.id, deletedAt: removed ? { not: null } : null,
      ...(query ? { OR: [{ name: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }, ...( /^\d+$/.test(query) && Number(query) < 2147483647 ? [{ number: Number(query) }] : [])] } : {}) };
    if (focusItemId) {
      const target = await tx.item.findFirst({ where: { ...where, id: focusItemId }, select: { number: true } });
      if (!target) throw new AppError(404, 'Річ уже прибрана або переміщена.');
      const preceding = await tx.item.count({ where: { ...where, number: { lt: target.number } } });
      page = Math.floor(preceding / 24) + 1;
    }
    const items = await tx.item.findMany({ where, orderBy: { number: 'asc' }, skip: (page-1)*24, take: 24 });
    const total = await tx.item.count({ where });
    const { publicToken: token, ownerId: _ownerId, ...safe } = box;
    return { box: { ...safe, ...(access.kind === 'owner' ? { publicToken: token } : {}), itemCount: total }, items, total, page,
      isOwner: access.kind === 'owner', canEdit: access.kind === 'owner' || box.guestPermission === 'EDIT' };
  });
}
export async function searchItems(userId: string, query: string, page: number) {
  const where: Prisma.ItemWhereInput = { deletedAt: null, box: { ownerId: userId, deletedAt: null }, OR: [
    { name: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } },
    { box: { name: { contains: query, mode: 'insensitive' } } },
  ] };
  const [items, total] = await db.$transaction([
    db.item.findMany({ where, include: { box: { select: { name: true } } }, take: 24, skip: (page-1)*24, orderBy: { createdAt: 'desc' } }), db.item.count({ where }),
  ]);
  return { items: items.map(({ box, ...item }) => ({ ...item, boxName: box.name })), total, page };
}
export async function changeBox(access: Access, action: 'update'|'rotate'|'delete', raw: unknown) {
  if (access.kind !== 'owner') throw new AppError(403, 'Тільки власник може керувати коробкою.');
  const data = action === 'update' ? boxUpdate.parse(raw) : versionInput.parse(raw);
  return db.$transaction(async tx => {
    const box = await resolveBox(tx, access, true, true);
    if (box.version !== data.version) throw new AppError(409, 'Коробка вже змінилася. Оновіть сторінку.');
    const updated = await tx.box.update({ where: { id: box.id }, data: {
      ...(action === 'update' ? boxUpdate.parse(raw) : action === 'rotate' ? { publicToken: publicToken() } : { deletedAt: new Date() }),
      version: { increment: 1 },
    } });
    const actions = action === 'update'
      ? [...(updated.name !== box.name ? ['BOX_RENAMED'] : []), ...(updated.guestPermission !== box.guestPermission ? ['GUEST_PERMISSION_CHANGED'] : []), ...(updated.description !== box.description ? ['BOX_UPDATED'] : [])]
      : [action === 'rotate' ? 'QR_REGENERATED' : 'BOX_DELETED'];
    for (const event of actions) await tx.activity.create({ data: { boxId: box.id, action: event, ...actor(access) } });
    return updated;
  });
}
export async function saveItem(access: Access, raw: unknown, editing = false) {
  const data = itemInput.parse(raw);
  const result = await db.$transaction(async tx => {
    const box = await resolveBox(tx, access, true, true);
    if (await tx.activity.findUnique({ where: { id: `item-purged:${data.id}` } })) throw new AppError(409, 'Річ остаточно видалена. Створіть нову річ.');
    const old = await tx.item.findUnique({ where: { id: data.id } });
    if (old && old.boxId !== box.id) throw new AppError(404, 'Річ не знайдено.');
    if (!editing && old) {
      if (old.deletedAt) throw new AppError(409, 'Цю операцію вже завершено. Оновіть список.');
      return { item: old, oldPhotoId: null };
    }
    if (editing && (!old || old.deletedAt)) throw new AppError(404, 'Річ не знайдено.');
    if (editing && old!.version !== data.version) throw new AppError(409, 'Річ уже змінилася. Оновіть список і відкрийте форму знову.');
    if (data.photoId) {
      await tx.$queryRaw`SELECT id FROM "Media" WHERE id = ${data.photoId} FOR UPDATE`;
      const photo = await tx.media.findUnique({ where: { id: data.photoId }, include: { item: true } });
      if (!photo || photo.boxId !== box.id || photo.status !== 'READY' || photo.deletionRequestedAt || (photo.item && photo.item.id !== data.id)) throw new AppError(400, 'Фотографія недоступна для цієї речі.');
    }
    const values = { name: data.name, description: data.description, photoId: data.photoId };
    const item = editing
      ? await tx.item.update({ where: { id: data.id }, data: { ...values, version: { increment: 1 } } })
      : await tx.item.create({ data: { ...values, id: data.id, boxId: box.id, number: box.nextItemNumber, createdByActorType: actor(access).actorType, createdByUserId: actor(access).actorUserId } });
    if (!editing) await tx.box.update({ where: { id: box.id }, data: { nextItemNumber: { increment: 1 } } });
    await tx.activity.create({ data: { boxId: box.id, itemId: item.id, itemName: item.name, action: editing ? 'ITEM_UPDATED' : 'ITEM_ADDED', ...actor(access) } });
    const oldPhotoId = old?.photoId && old.photoId !== data.photoId ? old.photoId : null;
    if (oldPhotoId) await tx.media.update({ where: { id: oldPhotoId }, data: { deletionRequestedAt: new Date() } });
    return { item, oldPhotoId };
  });
  const cleanupPending = result.oldPhotoId ? !(await deleteQueuedPhoto(result.oldPhotoId)) : false;
  return { ...result.item, cleanupPending };
}

export async function purgeItem(access: Access, itemId: string, raw: unknown) {
  if (access.kind !== 'owner') throw new AppError(403, 'Остаточно видаляти може лише власник.');
  const { version } = versionInput.parse(raw);
  const photoId = await db.$transaction(async tx => {
    const box = await resolveBox(tx, access, true, true);
    const item = await tx.item.findFirst({ where: { id: itemId, boxId: box.id } });
    if (!item) return null; // Safe retry after a completed deletion.
    if (!item.deletedAt) throw new AppError(409, 'Спершу перемістіть річ у «Прибрані».');
    if (item.version !== version) throw new AppError(409, 'Річ уже змінилася. Оновіть список.');
    await tx.activity.create({ data: { id: `item-purged:${itemId}`, boxId: box.id, action: 'ITEM_PURGED', itemName: item.name, ...actor(access) } });
    await tx.item.delete({ where: { id: item.id } });
    if (item.photoId) await tx.media.update({ where: { id: item.photoId }, data: { deletionRequestedAt: new Date() } });
    return item.photoId;
  });
  return { deleted: true, cleanupPending: photoId ? !(await deleteQueuedPhoto(photoId)) : false };
}
export async function removeOrRestore(access: Access, itemId: string, raw: unknown, restore = false) {
  const { version } = versionInput.parse(raw);
  if (restore && access.kind !== 'owner') throw new AppError(403, 'Відновлювати може лише власник.');
  return db.$transaction(async tx => {
    const box = await resolveBox(tx, access, true, true);
    const item = await tx.item.findFirst({ where: { id: itemId, boxId: box.id } });
    if (!item) throw new AppError(404, 'Річ не знайдено.');
    if ((restore && !item.deletedAt) || (!restore && item.deletedAt)) return item;
    if (item.version !== version) throw new AppError(409, 'Річ уже змінилася. Оновіть список.');
    const updated = await tx.item.update({ where: { id: item.id }, data: { deletedAt: restore ? null : new Date(), version: { increment: 1 } } });
    await tx.activity.create({ data: { boxId: box.id, itemId, itemName: item.name, action: restore ? 'ITEM_RESTORED' : 'ITEM_REMOVED', ...actor(access) } });
    return updated;
  });
}
export async function history(access: Access, page: number) {
  if (access.kind !== 'owner') throw new AppError(403, 'Історія доступна власнику.');
  return db.$transaction(async tx => {
    const box = await resolveBox(tx, access);
    const where = { boxId: box.id };
    return { events: await tx.activity.findMany({ where, orderBy: { createdAt: 'desc' }, take: 30, skip: (page-1)*30 }), total: await tx.activity.count({ where }), page };
  });
}
