import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { GET, POST, PATCH, DELETE } from '../../src/app/api/[...path]/route';
import { db } from '../../src/server/db';
import { createBox, changeBox } from '../../src/server/inventory';
import { rateLimit } from '../../src/server/http';

test('HTTP public API: Origin, validation, safe responses, VIEW mutation denial and removed-photo access',async()=>{
  if(!process.env.DATABASE_URL?.includes('test'))throw new Error('Use a separate test database.');
  process.env.APP_URL='http://localhost:3000';process.env.AUTH_SECRET=randomBytes(32).toString('base64');process.env.TOKEN_ENCRYPTION_KEY=randomBytes(32).toString('base64');process.env.AUTH_GOOGLE_ID='test';process.env.AUTH_GOOGLE_SECRET='test';
  const user=await db.user.create({data:{email:`${crypto.randomUUID()}@route.test.invalid`}});
  const box=await createBox(user.id,{id:crypto.randomUUID(),name:'HTTP'});
  const owner={kind:'owner' as const,userId:user.id,boxId:box.id};
  const route=(suffix='')=>({params:Promise.resolve({path:['public','boxes',box.publicToken,...suffix.split('/').filter(Boolean)]})});
  const req=(method:string,body?:unknown,origin='http://localhost:3000')=>new Request('http://localhost:3000/api/public/boxes/'+box.publicToken,{method,headers:{Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  try{
    const read=await GET(req('GET'),route());assert.equal(read.status,200);assert.equal(read.headers.get('cache-control'),'private, no-store');
    const content=await read.json();assert.equal(content.box.ownerId,undefined);assert.equal(content.box.publicToken,undefined);
    const input={id:crypto.randomUUID(),name:'Гостьова річ'};
    assert.equal((await POST(req('POST',input,'https://other.example'),route('items'))).status,403);
    assert.equal((await POST(req('POST',input),route('items'))).status,403);
    assert.equal((await DELETE(req('DELETE',{version:1}),route())).status,403);
    assert.equal((await DELETE(req('DELETE',{version:1}),route(`items/${input.id}/permanent`))).status,403);
    await changeBox(owner,'update',{name:box.name,description:'',guestPermission:'EDIT',version:1});
    const added=await POST(req('POST',input),route('items'));assert.equal(added.status,201);
    assert.equal((await PATCH(req('PATCH',{...input,version:1,id:crypto.randomUUID()}),route(`items/${input.id}`))).status,400);
    assert.equal((await POST(req('POST',{...input,ownerId:'attacker'}),route('items'))).status,400);
    assert.equal((await DELETE(req('DELETE',{version:1}),route(`items/${input.id}`))).status,200);
    assert.equal((await GET(req('GET'),route(`items/${input.id}/photo`))).status,404);
    const key='test-limit:'+crypto.randomUUID();await rateLimit(key,1);await assert.rejects(()=>rateLimit(key,1),/Забагато/);
    const latest=await db.box.findUniqueOrThrow({where:{id:box.id}});await changeBox(owner,'rotate',{version:latest.version});
    assert.equal((await GET(req('GET'),route())).status,404);
  }finally{await db.user.delete({where:{id:user.id}});await db.$disconnect();}
});
