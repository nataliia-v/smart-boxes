import test from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../../src/server/db';
import { createBox, listBoxes, moveBox, detail, removeOrRestore } from '../../src/server/inventory';

test('box ordering persists, rejects foreign IDs, keeps new boxes; focus resolves the actual item page',async()=>{
  if(!process.env.DATABASE_URL?.includes('test'))throw new Error('Use a separate test database.');
  const user=await db.user.create({data:{email:`${crypto.randomUUID()}@order.test.invalid`}});
  const other=await db.user.create({data:{email:`${crypto.randomUUID()}@order.test.invalid`}});
  try{
    const a=await createBox(user.id,{id:crypto.randomUUID(),name:'A'});
    const b=await createBox(user.id,{id:crypto.randomUUID(),name:'B'});
    const c=await createBox(user.id,{id:crypto.randomUUID(),name:'C'});
    const foreign=await createBox(other.id,{id:crypto.randomUUID(),name:'Foreign'});
    assert.deepEqual((await listBoxes(user.id)).map(b=>b.id),[c.id,b.id,a.id]);
    await moveBox(user.id,{id:a.id,beforeId:c.id});
    assert.deepEqual((await listBoxes(user.id)).map(b=>b.id),[a.id,c.id,b.id]);
    await moveBox(user.id,{id:a.id,beforeId:null});
    assert.deepEqual((await listBoxes(user.id)).map(b=>b.id),[c.id,b.id,a.id]);
    await assert.rejects(()=>moveBox(user.id,{id:foreign.id,beforeId:a.id}));
    await assert.rejects(()=>moveBox(user.id,{id:a.id,beforeId:foreign.id}));
    await assert.rejects(()=>moveBox(user.id,{id:a.id,beforeId:b.id,ownerId:other.id}));
    await Promise.all([moveBox(user.id,{id:b.id,beforeId:c.id}),createBox(user.id,{id:crypto.randomUUID(),name:'New'})]);
    assert.equal((await listBoxes(user.id)).length,4);
    const records=Array.from({length:30},(_,i)=>({id:crypto.randomUUID(),boxId:a.id,number:(i+1)*2,name:`Річ ${i+1}`,createdByActorType:'OWNER' as const}));
    await db.item.createMany({data:records});
    const access={kind:'owner' as const,userId:user.id,boxId:a.id};
    const focused=await detail(access,'',1,false,records[26].id);
    assert.equal(focused.page,2);assert.ok(focused.items.some(i=>i.id===records[26].id));
    await removeOrRestore(access,records[0].id,{version:1});
    const shifted=await detail(access,'',1,false,records[24].id);
    assert.equal(shifted.page,1); // Count active records, not number / page size.
    await assert.rejects(()=>detail({kind:'owner',userId:other.id,boxId:a.id},'',1,false,records[26].id));
    await assert.rejects(()=>detail({kind:'owner',userId:user.id,boxId:b.id},'',1,false,records[26].id));
    await assert.rejects(()=>detail(access,'',1,false,records[0].id));
  }finally{await db.user.deleteMany({where:{id:{in:[user.id,other.id]}}});await db.$disconnect();}
});
