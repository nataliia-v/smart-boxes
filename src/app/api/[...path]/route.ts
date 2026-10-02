import { db } from '@/server/db';
import { endpoint, response, owner, origin, rateLimit, clientIp, jsonBody, boundedBody } from '@/server/http';
import { AppError } from '@/server/errors';
import { createBox, listBoxes, moveBox, detail, changeBox, saveItem, removeOrRestore, purgeItem, history, searchItems } from '@/server/inventory';
import { after } from 'next/server';
import { retryPhotoDeletions } from '@/server/photo-cleanup';
import { servePhoto, uploadPhoto } from '@/server/photos';
import { uuid } from '@/lib/validation';
import type { Access } from '@/server/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  return endpoint(async () => {
    const { path } = await context.params;
    const method = request.method, url = new URL(request.url);
    if (method !== 'GET') origin(request);
    const query = (url.searchParams.get('q') || '').slice(0,200);
    const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get('page') || '1') || 1));
    if (path[0] === 'me' && method === 'GET') {
      const userId = await owner();
      after(() => retryPhotoDeletions(userId));
      return response(await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, driveStatus: true } }));
    }
    if (path[0] === 'search' && method === 'GET') return response(await searchItems(await owner(), query, page));
    if (path.length === 2 && path[0] === 'boxes' && path[1] === 'order' && method === 'PATCH') {
      const userId = await owner();
      await rateLimit('owner:order:'+userId, 60);
      return response(await moveBox(userId, await jsonBody(request)));
    }
    if (path.length === 1 && path[0] === 'boxes') {
      const userId = await owner();
      if (method === 'GET') return response(await listBoxes(userId));
      if (method === 'POST') { await rateLimit('owner:create:'+userId, 20); return response(await createBox(userId, await jsonBody(request)), 201); }
    }
    let access: Access, rest: string[];
    if (path[0] === 'public' && path[1] === 'boxes' && /^[\w-]{43}$/.test(path[2] || '')) {
      access = { kind: 'guest', token: path[2] }; rest = path.slice(3);
      await rateLimit('public-ip:'+clientIp(request), method === 'GET' ? 300 : 60);
      await rateLimit('public-box:'+path[2]+':'+(method === 'GET' ? 'read' : 'write'), method === 'GET' ? 600 : 60);
    } else if (path[0] === 'boxes' && path[1]) {
      access = { kind: 'owner', userId: await owner(), boxId: uuid.parse(path[1]) }; rest = path.slice(2);
      await rateLimit('owner:'+access.userId, 300);
    } else throw new AppError(404, 'Сторінку не знайдено.');
    if (!rest.length) {
      if (method === 'GET') return response(await detail(access, query, page, url.searchParams.get('removed') === '1', url.searchParams.has('focus') ? uuid.parse(url.searchParams.get('focus')) : undefined));
      if (method === 'PATCH') return response(await changeBox(access, 'update', await jsonBody(request)));
      if (method === 'DELETE') return response(await changeBox(access, 'delete', await jsonBody(request)));
    }
    if (rest.length === 1 && rest[0] === 'rotate' && method === 'POST') return response(await changeBox(access, 'rotate', await jsonBody(request)));
    if (rest.length === 1 && rest[0] === 'activity' && method === 'GET') return response(await history(access, page));
    if (rest.length === 1 && rest[0] === 'photos' && method === 'POST') {
      await rateLimit('photos:'+ (access.kind === 'guest' ? access.token : access.userId), 12);
      const contentType = request.headers.get('content-type') || '';
      if (!contentType.startsWith('multipart/form-data')) throw new AppError(415, 'Очікується фото.');
      const bytes = await boundedBody(request, 1600000);
      const form = await new Response(new Uint8Array(bytes), { headers: { 'Content-Type': contentType } }).formData();
      const file = form.get('photo');
      if (!(file instanceof File)) throw new AppError(400, 'Виберіть фото.');
      const id = uuid.parse(form.get('id')); const title = String(form.get('title') || 'photo').slice(0,200);
      return response(await uploadPhoto(access, id, title, Buffer.from(await file.arrayBuffer())), 201);
    }
    if (rest[0] === 'items') {
      if (rest.length === 1 && method === 'POST') return response(await saveItem(access, await jsonBody(request)), 201);
      const id = uuid.parse(rest[1]);
      if (rest.length === 3 && rest[2] === 'photo' && method === 'GET') return servePhoto(access, id);
      if (rest.length === 3 && rest[2] === 'restore' && method === 'POST') return response(await removeOrRestore(access, id, await jsonBody(request), true));
      if (rest.length === 3 && rest[2] === 'permanent' && method === 'DELETE') return response(await purgeItem(access, id, await jsonBody(request)));
      if (rest.length === 2 && method === 'PATCH') {
        const body = await jsonBody(request); if (body.id !== id) throw new AppError(400, 'ID речі не збігається.');
        return response(await saveItem(access, body, true));
      }
      if (rest.length === 2 && method === 'DELETE') return response(await removeOrRestore(access, id, await jsonBody(request)));
    }
    throw new AppError(404, 'Операцію не знайдено.');
  });
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
