import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { db } from '../../src/server/db';
import { encrypt, decrypt } from '../../src/server/crypto';
import { driveToken } from '../../src/server/drive';
import { uploadPhoto, servePhoto } from '../../src/server/photos';
import { createBox, changeBox, saveItem, removeOrRestore, purgeItem } from '../../src/server/inventory';
import { retryPhotoDeletions } from '../../src/server/photo-cleanup';
import type { Access } from '../../src/server/access';

test('Drive boundary: offline refresh, private guest upload, photo authorization, quota and revocation', async () => {
  if (!process.env.DATABASE_URL?.includes('test')) throw new Error('Use a separate test database.');
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  process.env.APP_URL = 'http://localhost:3000';
  process.env.AUTH_SECRET = randomBytes(32).toString('base64');
  process.env.AUTH_GOOGLE_ID = 'test-client';
  process.env.AUTH_GOOGLE_SECRET = 'test-secret';
  const user = await db.user.create({ data: { email: `${crypto.randomUUID()}@drive.test.invalid` } });
  const account = await db.account.create({ data: { userId: user.id, type: 'oauth', provider: 'google', providerAccountId: crypto.randomUUID(), refresh_token: encrypt('offline-refresh'), access_token: encrypt('expired'), expires_at: 0, scope: 'openid https://www.googleapis.com/auth/drive.file' } });
  const originalFetch = globalThis.fetch;
  const calls: { url: string; body: string; method?: string }[] = [];
  let refreshes = 0, uploadFailure = false, deleteFailure = false, rotateOnUpload: (() => Promise<void>) | null = null;
  const jpeg = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#aabbcc' } }).jpeg().toBuffer();
  globalThis.fetch = async (input, init) => {
    const url = String(input); const body = init?.body instanceof Uint8Array ? Buffer.from(init.body).toString() : String(init?.body || '');
    calls.push({ url, body, method: init?.method });
    if (url === 'https://oauth2.googleapis.com/token') {
      refreshes++;
      assert.ok(body.includes('refresh_token=offline-refresh'));
      return Response.json({ access_token: 'fresh-access', expires_in: 3600 });
    }
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fresh-access');
    if (init?.method === 'DELETE') return deleteFailure ? new Response(null, { status: 503 }) : new Response(null, { status: 204 });
    if (url.includes('/files/generateIds')) return Response.json({ ids: ['file-' + crypto.randomUUID()] });
    if (url.includes('/upload/')) {
      assert.ok(body.includes('parents'));
      assert.ok(!body.includes('anyone'));
      if (rotateOnUpload) { const work = rotateOnUpload; rotateOnUpload = null; await work(); }
      return uploadFailure ? Response.json({ error: { message: 'SECRET_INTERNAL_QUOTA_DETAILS' } }, { status: 403 }) : Response.json({ id: 'uploaded' });
    }
    if (url.includes('?alt=media')) return new Response(new Uint8Array(jpeg));
    if (init?.method === 'POST') return Response.json({ id: 'folder-' + crypto.randomUUID() });
    if (init?.method === 'PATCH') return Response.json({});
    return Response.json({ id: 'folder', trashed: false, mimeType: 'application/vnd.google-apps.folder' });
  };
  try {
    const tokens = await Promise.all([driveToken(user.id), driveToken(user.id), driveToken(user.id)]);
    assert.deepEqual(tokens, ['fresh-access','fresh-access','fresh-access']); assert.equal(refreshes, 1);
    const stored = await db.account.findUniqueOrThrow({ where: { id: account.id } });
    assert.notEqual(stored.access_token, 'fresh-access'); assert.equal(decrypt(stored.refresh_token!), 'offline-refresh');
    const box = await createBox(user.id, { id: crypto.randomUUID(), name: 'Фото' });
    const owner: Access = { kind: 'owner', userId: user.id, boxId: box.id };
    const guest: Access = { kind: 'guest', token: box.publicToken };
    await changeBox(owner, 'update', { name: box.name, description: '', guestPermission: 'EDIT', version: 1 });
    const upload = await uploadPhoto(guest, crypto.randomUUID(), 'Пазли', jpeg);
    assert.deepEqual(Object.keys(upload), ['id']); // No file ID, access token or source URL.
    assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
    const item = await saveItem(guest, { id: crypto.randomUUID(), name: 'Пазли', photoId: upload.id });
    const photo = await servePhoto(guest, item.id);
    assert.equal(photo.headers.get('cache-control'), 'private, no-store');
    assert.equal(photo.headers.get('content-type'), 'image/jpeg');
    assert.ok((await photo.arrayBuffer()).byteLength > 0);
    assert.ok(!calls.some(call => call.url.includes('/permissions')));
    const oldMedia = await db.media.findUniqueOrThrow({ where: { id: upload.id } });
    const replacement = await uploadPhoto(owner, crypto.randomUUID(), 'Нове фото', jpeg);
    const edited = await saveItem(owner, { id: item.id, name: item.name, photoId: replacement.id, version: item.version }, true);
    assert.equal(edited.cleanupPending, false);
    assert.equal(await db.media.findUnique({ where: { id: upload.id } }), null);
    assert.ok(calls.some(call => call.method === 'DELETE' && call.url.endsWith('/' + oldMedia.driveFileId)));
    assert.ok(await db.media.findUnique({ where: { id: replacement.id } }));
    await assert.rejects(() => purgeItem(guest, edited.id, { version: edited.version }), /власник/);
    await assert.rejects(() => purgeItem(owner, edited.id, { version: edited.version }), /Прибрані/);
    const removed = await removeOrRestore(owner, edited.id, { version: edited.version });
    await assert.rejects(() => purgeItem(owner, removed.id, { version: 1 }), /змінилася/);
    deleteFailure = true;
    const purged = await purgeItem(owner, removed.id, { version: removed.version });
    assert.equal(purged.cleanupPending, true);
    assert.equal(await db.item.findUnique({ where: { id: item.id } }), null);
    assert.ok((await db.media.findUniqueOrThrow({ where: { id: replacement.id } })).deletionRequestedAt);
    assert.equal(await db.activity.count({ where: { boxId: box.id, action: 'ITEM_PURGED', itemName: item.name } }), 1);
    await assert.rejects(() => saveItem(guest, { id: item.id, name: item.name }), /остаточно/);
    await assert.rejects(() => saveItem(owner, { id: crypto.randomUUID(), name: 'Reuse deleted media', photoId: replacement.id }), /недоступна/);
    deleteFailure = false;
    await retryPhotoDeletions(user.id);
    assert.equal(await db.media.findUnique({ where: { id: replacement.id } }), null);
    assert.equal((await purgeItem(owner, item.id, { version: removed.version })).deleted, true);
    const afterPurge = await saveItem(owner, { id: crypto.randomUUID(), name: 'Наступна' });
    assert.ok(afterPurge.number > item.number);
    uploadFailure = true;
    const failedId = crypto.randomUUID();
    await assert.rejects(() => uploadPhoto(guest, failedId, 'Помилка', jpeg), error => error instanceof Error && !error.message.includes('SECRET_INTERNAL') && error.message.includes('Drive'));
    assert.equal((await db.media.findUniqueOrThrow({ where: { id: failedId } })).status, 'FAILED');
    assert.ok(calls.some(call => call.body === '{"trashed":true}'));
    uploadFailure = false;
    rotateOnUpload = async () => { await changeBox(owner, 'rotate', { version: 2 }); };
    const revokedId = crypto.randomUUID();
    await assert.rejects(() => uploadPhoto(guest, revokedId, 'Відкликане', jpeg), /відкликано/);
    assert.equal((await db.media.findUniqueOrThrow({ where: { id: revokedId } })).status, 'FAILED');
    await assert.rejects(() => servePhoto(guest, item.id), /відкликано/);
  } finally {
    globalThis.fetch = originalFetch;
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
});
