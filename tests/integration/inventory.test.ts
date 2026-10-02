import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../src/server/db';
import { createBox, detail, changeBox, saveItem, removeOrRestore, history, searchItems } from '../../src/server/inventory';
import type { Access } from '../../src/server/access';

test('PostgreSQL: owner isolation, QR modes, replay, concurrency, history and recovery',async()=>{
  if(!process.env.DATABASE_URL?.includes('test'))throw new Error('Integration tests require a separate database with "test" in its URL.');
  const alice=await db.user.create({data:{email:`alice-${crypto.randomUUID()}@test.invalid`}});
  const bob=await db.user.create({data:{email:`bob-${crypto.randomUUID()}@test.invalid`}});
  try {
    const box=await createBox(alice.id,{id:crypto.randomUUID(),name:'Іграшки'});
    const other=await createBox(bob.id,{id:crypto.randomUUID(),name:'Чужа коробка'});
    const owner:Access={kind:'owner',userId:alice.id,boxId:box.id};
    const guest:Access={kind:'guest',token:box.publicToken};
    const intruder:Access={kind:'owner',userId:bob.id,boxId:box.id};
    await assert.rejects(()=>detail(intruder));
    assert.equal((await detail(guest)).box.publicToken,undefined);
    await assert.rejects(()=>saveItem(guest,{id:crypto.randomUUID(),name:'Denied'}));
    await assert.rejects(()=>changeBox(guest,'delete',{version:1}));
    await assert.rejects(()=>history(guest,1));
    await changeBox(owner,'update',{name:box.name,description:'',guestPermission:'EDIT',version:box.version});
    const input={id:crypto.randomUUID(),name:'Пазли'};
    const first=await saveItem(guest,input);const replay=await saveItem(guest,input);assert.equal(first.id,replay.id);
    assert.equal(await db.activity.count({where:{itemId:first.id,action:'ITEM_ADDED'}}),1);
    const concurrent=await Promise.all(Array.from({length:6},(_,i)=>saveItem(guest,{id:crypto.randomUUID(),name:`Річ ${i}`})));
    assert.equal(new Set(concurrent.map(i=>i.number)).size,6);
    const foreign=await saveItem({kind:'owner',userId:bob.id,boxId:other.id},{id:crypto.randomUUID(),name:'Секрет Боба'});
    await assert.rejects(()=>removeOrRestore(guest,foreign.id,{version:1}));
    await assert.rejects(()=>saveItem(guest,{id:foreign.id,name:'Intrusion',version:1},true));
    const edited=await saveItem(guest,{...input,name:'Пазли нові',version:first.version},true);
    await assert.rejects(()=>saveItem(guest,{...input,name:'Stale',version:first.version},true));
    await removeOrRestore(guest,edited.id,{version:edited.version});
    assert.ok(!(await detail(guest)).items.some(i=>i.id===edited.id));
    await assert.rejects(()=>removeOrRestore(guest,edited.id,{version:edited.version+1},true));
    const restored=await removeOrRestore(owner,edited.id,{version:edited.version+1},true);assert.equal(restored.number,first.number);
    const activity=await history(owner,1);assert.ok(activity.events.some(e=>e.action==='ITEM_ADDED'&&e.actorType==='GUEST'&&e.actorUserId===null));
    assert.ok((await searchItems(alice.id,'Секрет Боба',1)).total===0);
    const media=await db.media.create({data:{id:crypto.randomUUID(),boxId:other.id,filename:'foreign.jpg',bytes:10,status:'READY'}});
    await assert.rejects(()=>saveItem(guest,{id:crypto.randomUUID(),name:'Photo intrusion',photoId:media.id}));
    const updated=await db.box.findUniqueOrThrow({where:{id:box.id}});
    const rotated=await changeBox(owner,'rotate',{version:updated.version});
    await assert.rejects(()=>detail(guest));
    const newGuest:Access={kind:'guest',token:rotated.publicToken};assert.ok((await detail(newGuest)).total>0);
    await changeBox(owner,'update',{name:box.name,description:'',guestPermission:'PRIVATE',version:rotated.version});
    await assert.rejects(()=>detail(newGuest));assert.ok((await detail(owner)).total>0);
  }finally{await db.user.deleteMany({where:{id:{in:[alice.id,bob.id]}}});await db.$disconnect();}
});
