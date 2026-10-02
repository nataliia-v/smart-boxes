import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { permitted } from '../src/server/access';
import { encrypt, decrypt, publicToken } from '../src/server/crypto';
import { normalizePhoto } from '../src/server/photos';
import { slug } from '../src/lib/transliteration';
import { itemInput } from '../src/lib/validation';

const box={ownerId:'owner',publicToken:'valid',guestPermission:'VIEW' as const,deletedAt:null};
test('VIEW, EDIT, PRIVATE enforce distinct guest capabilities',()=>{
  assert.doesNotThrow(()=>permitted(box,{kind:'guest',token:'valid'}));
  assert.throws(()=>permitted(box,{kind:'guest',token:'valid'},true),/перегляд/);
  assert.doesNotThrow(()=>permitted({...box,guestPermission:'EDIT'},{kind:'guest',token:'valid'},true));
  assert.throws(()=>permitted({...box,guestPermission:'PRIVATE'},{kind:'guest',token:'valid'}),/відкликано/);
});
test('ownership, revoked QR and deleted boxes are checked server-side',()=>{
  assert.doesNotThrow(()=>permitted({...box,guestPermission:'PRIVATE'},{kind:'owner',userId:'owner',boxId:'box'},true));
  assert.throws(()=>permitted(box,{kind:'owner',userId:'other',boxId:'box'}));
  assert.throws(()=>permitted(box,{kind:'guest',token:'old-token'}));
  assert.throws(()=>permitted({...box,deletedAt:new Date()},{kind:'owner',userId:'owner',boxId:'box'}));
});
test('credentials use authenticated encryption and reject tampering',()=>{
  process.env.TOKEN_ENCRYPTION_KEY=randomBytes(32).toString('base64');
  const token='refresh-token-not-for-browser'; const a=encrypt(token),b=encrypt(token);
  assert.notEqual(a,b);assert.ok(!a.includes(token));assert.equal(decrypt(a),token);
  const pieces=a.split('.');pieces[2]=randomBytes(16).toString('base64url');assert.throws(()=>decrypt(pieces.join('.')));
});
test('QR tokens have 256 bits of entropy and URL-safe length',()=>{
  const tokens=Array.from({length:100},publicToken);assert.equal(new Set(tokens).size,100);
  for(const value of tokens)assert.match(value,/^[\w-]{43}$/);
});
test('item validation rejects privilege fields, allows no photo',()=>{
  const data={id:crypto.randomUUID(),name:'  Пазли  '};assert.equal(itemInput.parse(data).name,'Пазли');assert.equal(itemInput.parse(data).photoId,null);
  assert.throws(()=>itemInput.parse({...data,ownerId:'other'}));assert.throws(()=>itemInput.parse({...data,name:' '}));
});
test('photo validation decodes real images instead of trusting MIME or magic bytes',async()=>{
  await assert.rejects(()=>normalizePhoto(Buffer.from([255,216,255,224,0,0])),/прочитати/);
  await assert.rejects(()=>normalizePhoto(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),/прочитати/);
  await assert.rejects(()=>normalizePhoto(Buffer.alloc(1500001)),/1,5/);
  const png=await sharp({create:{width:1500,height:1000,channels:3,background:'#aacbaa'}}).png().toBuffer();
  const result=await normalizePhoto(png);const meta=await sharp(result).metadata();assert.equal(meta.format,'jpeg');assert.equal(meta.width,1200);assert.equal(meta.exif,undefined);
});
test('Ukrainian filename transliteration remains readable',()=>{
  assert.equal(slug('Пазли мʼякі'),'pazly-miaki');assert.equal(slug('Їжак і Ялинка'),'yizhak-i-yalynka');assert.equal(slug('Згода'),'zghoda');assert.equal(slug(' / '),'item');
});
