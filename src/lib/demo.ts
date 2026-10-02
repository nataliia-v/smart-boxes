// Explicit local-only demo. Never acts as an authentication or API fallback.
import type { BoxView, ItemView, ActivityView } from './types';
type Store = { boxes: (BoxView & { next: number })[]; items: ItemView[]; events: (ActivityView & { boxId: string })[]; photos: Record<string,string> };
const KEY = 'smart-box-v2-demo';
function seed(): Store {
  const id = crypto.randomUUID();
  return { boxes: [{ id, name: 'Іграшки 1–3 роки', description: 'Для маленьких відкриттів', guestPermission: 'VIEW', version: 1, itemCount: 3, publicToken: crypto.randomUUID(), next: 4 }],
    items: ['Пазли мʼякі','Водні розмальовки','Дошка з фігурками'].map((name,i) => ({ id: crypto.randomUUID(), number:i+1,name,description:i===0?'Повний набір у сумочці.':'',photoId:null,version:1,deletedAt:null,boxId:id })), events:[],photos:{} };
}
function read(): Store { const data=localStorage.getItem(KEY); return data ? JSON.parse(data) : seed(); }
function save(store:Store) { try { localStorage.setItem(KEY,JSON.stringify(store)); } catch { throw new Error('Демо-сховище заповнене. Скиньте демо або видаліть фото.'); } }
export function demoPhoto(id:string) { return read().photos[id] || ''; }
export function resetDemo() { localStorage.removeItem(KEY); }
export async function demoRequest(path:string, method='GET', body?:unknown):Promise<unknown> {
  const store=read(); const url=new URL(path,'https://demo.test'); const parts=url.pathname.split('/').filter(Boolean).slice(1);
  const data=body as Record<string,unknown>; const now=new Date().toISOString();
  let page=Number(url.searchParams.get('page')||1);
  const query=(url.searchParams.get('q')||'').toLocaleLowerCase();
  const event=(boxId:string,action:string,item?:ItemView)=>store.events.unshift({id:crypto.randomUUID(),boxId,action,actorType:'OWNER',itemName:item?.name||null,createdAt:now});
  let result: unknown;
  if(parts[0]==='boxes' && parts[1]==='order' && method==='PATCH') {
    const moving=store.boxes.find(box=>box.id===data.id);
    if(!moving || (data.beforeId&&!store.boxes.some(box=>box.id===data.beforeId)))throw new Error('Коробку не знайдено.');
    if(data.id!==data.beforeId){store.boxes=store.boxes.filter(box=>box!==moving);store.boxes.splice(data.beforeId?store.boxes.findIndex(box=>box.id===data.beforeId):store.boxes.length,0,moving);}
    result={saved:true};
  } else if(parts[0]==='boxes' && parts.length===1) {
    if(method==='POST') { const box={id:String(data.id),name:String(data.name),description:String(data.description||''),guestPermission:'VIEW' as const,version:1,itemCount:0,next:1,publicToken:crypto.randomUUID()};store.boxes.unshift(box);event(box.id,'BOX_CREATED');result=box; }
    else result=store.boxes.map(box=>({...box,itemCount:store.items.filter(i=>i.boxId===box.id&&!i.deletedAt).length}));
  } else if(parts[0]==='search') {
    const items=store.items.filter(i=>!i.deletedAt&&[i.name,i.description,store.boxes.find(b=>b.id===i.boxId)?.name||''].some(v=>v.toLowerCase().includes(query))).map(i=>({...i,boxName:store.boxes.find(b=>b.id===i.boxId)?.name}));
    result={items:items.slice((page-1)*24,page*24),total:items.length,page};
  } else {
    const box=store.boxes.find(b=>b.id===parts[1]); if(!box)throw new Error('Коробку не знайдено.');
    if(parts.length===2) {
      if(method==='PATCH'){Object.assign(box,data,{version:box.version+1});event(box.id,'BOX_UPDATED');result=box;}
      else if(method==='DELETE'){store.boxes=store.boxes.filter(b=>b!==box);store.items=store.items.filter(i=>i.boxId!==box.id);result={};}
      else { const removed=url.searchParams.get('removed')==='1'; const items=store.items.filter(i=>i.boxId===box.id&&Boolean(i.deletedAt)===removed&&`${i.name} ${i.description} ${i.number}`.toLowerCase().includes(query)).sort((a,b)=>a.number-b.number);
        const focus=url.searchParams.get('focus');if(focus){const index=items.findIndex(item=>item.id===focus);if(index<0)throw new Error('Річ уже прибрана або переміщена.');page=Math.floor(index/24)+1;}
        result={box,items:items.slice((page-1)*24,page*24),total:items.length,page,canEdit:true,isOwner:true}; }
    } else if(parts[2]==='rotate'){box.publicToken=crypto.randomUUID();box.version++;event(box.id,'QR_REGENERATED');result=box;}
    else if(parts[2]==='activity'){const events=store.events.filter(e=>e.boxId===box.id);result={events:events.slice((page-1)*30,page*30),total:events.length,page};}
    else if(parts[2]==='photos'){
      const form=body as FormData;const blob=form.get('photo') as Blob; const id=String(form.get('id'));
      const url=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=reject;reader.readAsDataURL(blob);});store.photos[id]=url;result={id};
    } else if(parts[2]==='items'){
      const old=store.items.find(i=>i.id===parts[3]&&i.boxId===box.id);
      if(method==='POST'&&parts.length===3){const item={...data,id:String(data.id),boxId:box.id,number:box.next++,version:1,deletedAt:null} as ItemView;store.items.push(item);event(box.id,'ITEM_ADDED',item);result=item;}
      else { if(!old)throw new Error('Річ не знайдено.'); if(method==='PATCH'){
          if(old.photoId&&old.photoId!==data.photoId)delete store.photos[old.photoId];
          Object.assign(old,data,{version:old.version+1});event(box.id,'ITEM_UPDATED',old);
        }
        if(method==='DELETE'&&parts[4]==='permanent'){
          if(!old.deletedAt)throw new Error('Спершу перемістіть річ у «Прибрані».');
          if(old.photoId)delete store.photos[old.photoId];
          store.items=store.items.filter(item=>item.id!==old.id);event(box.id,'ITEM_PURGED',old);
        }else if(method==='DELETE'){old.deletedAt=now;old.version++;event(box.id,'ITEM_REMOVED',old);}
        if(parts[4]==='restore'){old.deletedAt=null;old.version++;event(box.id,'ITEM_RESTORED',old);}result=old;
      }
    }
  }
  save(store);return structuredClone(result);
}
