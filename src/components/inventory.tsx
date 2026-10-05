'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Box, Plus, Search, ArrowLeft, QrCode, Settings, History, ArchiveRestore, X, ImagePlus, Trash2, PackageOpen, Link as LinkIcon, Check, LoaderCircle } from 'lucide-react';
import { SortableBoxes } from './sortable-boxes';
import { LegalLinks } from './legal-links';
import QRCode from 'qrcode';
import type { ActivityView, BoxView, Detail, ItemView } from '@/lib/types';
import { compressPhoto } from '@/lib/image-compression';
import { useLanguage } from './language';
import { messages, type MessageKey } from '@/lib/i18n';
import { localizedError } from '@/lib/error-messages';

type Modal = 'box'|'item'|'settings'|'qr'|'delete-item'|'purge-item'|'delete-box'|'rotate'|null;
export function Inventory({token,appUrl=''}:{token?:string;appUrl?:string}) {
  const {locale,t}=useLanguage();
  const permissionNames={VIEW:t('VIEW'),EDIT:t('EDIT'),PRIVATE:t('PRIVATE')};
  const guest=Boolean(token);
  const [boxes,setBoxes]=useState<BoxView[]>([]),[selected,setSelected]=useState(''),[detail,setDetail]=useState<Detail|null>(null);
  const [items,setItems]=useState<ItemView[]>([]),[total,setTotal]=useState(0),[events,setEvents]=useState<ActivityView[]>([]);
  const [tab,setTab]=useState<'items'|'removed'|'activity'>('items'),[query,setQuery]=useState(''),[page,setPage]=useState(1);
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[refresh,setRefresh]=useState(0);
  const [modal,setModal]=useState<Modal>(null),[editing,setEditing]=useState<ItemView|null>(null),[busy,setBusy]=useState(false),[formError,setFormError]=useState('');
  const [name,setName]=useState(''),[description,setDescription]=useState(''),[permission,setPermission]=useState<BoxView['guestPermission']>('VIEW');
  const [photo,setPhoto]=useState<Blob|null>(null),[preview,setPreview]=useState(''),[photoBusy,setPhotoBusy]=useState(false),[photoRemoved,setPhotoRemoved]=useState(false);
  const [qr,setQr]=useState(''),[copied,setCopied]=useState(false);
  const [driveWarning,setDriveWarning]=useState(false);
  const [ordering,setOrdering]=useState(false),[highlighted,setHighlighted]=useState('');
  const focusTarget=useRef<{boxId:string;itemId:string}|null>(null);
  const searchInput=useRef<HTMLInputElement>(null);
  const requestId=useRef(''),uploadId=useRef(''),photoGeneration=useRef(0),loadGeneration=useRef(0);
  const dialog=useRef<HTMLDialogElement>(null);
  const cleanupPending=useRef(false);
  const base=guest?`/api/public/boxes/${token}`:`/api/boxes/${selected}`;
  const itemBase=editing&&!guest?`/api/boxes/${editing.boxId}`:base;
  const request=useCallback(async <T,>(path:string,method='GET',body?:unknown):Promise<T>=>{
    const response=await fetch(path,{method,cache:'no-store',headers:body instanceof FormData?undefined:body?{'Content-Type':'application/json'}:undefined,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
    if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.code||data.error||'loadFailed');}
    return response.json();
  },[]);
  useEffect(()=>{
    if(guest)return;
    request<{driveStatus:string}>('/api/me').then(me=>setDriveWarning(me.driveStatus==='NEEDS_ATTENTION')).catch(()=>{});
  },[request,guest,refresh]);
  const photoUrl=(item:ItemView)=>item.photoId?`${guest?base:`/api/boxes/${item.boxId}`}/items/${item.id}/photo?v=${item.version}`:'';
  useEffect(()=>{
    const generation=++loadGeneration.current; const timer=setTimeout(async()=>{
      setLoading(true);setError('');
      try {
        if(guest||selected){
          const target=focusTarget.current?.boxId===selected?focusTarget.current:null;
          const data=await request<Detail>(`${base}?q=${encodeURIComponent(query)}&page=${page}&removed=${tab==='removed'?1:0}${target?'&focus='+target.itemId:''}`);
          if(generation!==loadGeneration.current)return;
          setDetail(data);setItems(data.items);setTotal(data.total);
          if(target){focusTarget.current=null;setPage(data.page);setHighlighted(target.itemId);}
          if(tab==='activity'){const history=await request<{events:ActivityView[];total:number}>(`${base}/activity?page=${page}`);if(generation!==loadGeneration.current)return;setEvents(history.events);setTotal(history.total);}
        } else {
          const list=await request<BoxView[]>('/api/boxes');if(generation!==loadGeneration.current)return;setBoxes(list);setDetail(null);
          if(query){const data=await request<{items:ItemView[];total:number}>(`/api/search?q=${encodeURIComponent(query)}&page=${page}`);if(generation!==loadGeneration.current)return;setItems(data.items);setTotal(data.total);}
          else {setItems([]);setTotal(list.length);}
        }
      }catch(err){if(generation===loadGeneration.current){focusTarget.current=null;setError((err as Error).message);setDetail(null);setItems([]);setBoxes([]);}}
      finally{if(generation===loadGeneration.current)setLoading(false);}
    },query?250:0);
    return()=>{clearTimeout(timer);loadGeneration.current++;};
  },[request,base,guest,selected,query,page,tab,refresh]);
  useEffect(()=>{if(modal)dialog.current?.showModal();else dialog.current?.close();},[modal]);
  useEffect(()=>{
    const update=()=>{if(!document.hidden&&!modal&&!busy&&!ordering)setRefresh(v=>v+1);};
    window.addEventListener('focus',update);window.addEventListener('online',update);
    return()=>{window.removeEventListener('focus',update);window.removeEventListener('online',update);};
  },[modal,busy,ordering]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(timer);},[notice]);
  useEffect(()=>{return()=>{if(preview.startsWith('blob:'))URL.revokeObjectURL(preview);};},[preview]);
  useEffect(()=>{
    if(!highlighted||loading)return;
    const node=document.getElementById(`item-${highlighted}`);
    if(!node)return;
    node.focus({preventScroll:true});
    node.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});
    const timer=setTimeout(()=>setHighlighted(''),4500);
    return()=>clearTimeout(timer);
  },[highlighted,loading,items]);
  function chooseBox(id:string){focusTarget.current=null;setHighlighted('');setSelected(id);setPage(1);setQuery('');setTab('items');setDetail(null);}
  function openSearchResult(item:ItemView){chooseBox(item.boxId);focusTarget.current={boxId:item.boxId,itemId:item.id};}
  function clearSearch(){setQuery('');setPage(1);searchInput.current?.focus();}
  async function reorderBoxes(ordered:BoxView[],id:string,beforeId:string|null){
    if(ordering)return;
    const previous=boxes;setBoxes(ordered);setOrdering(true);setError('');
    try{await request('/api/boxes/order','PATCH',{id,beforeId});setNotice('orderSaved');}
    catch(err){setBoxes(previous);setError((err as Error).message);}
    finally{setOrdering(false);}
  }
  function open(value:Modal,item:ItemView|null=null){
    setModal(value);setFormError('');setEditing(item);setBusy(false);setPhoto(null);setPhotoRemoved(false);setPhotoBusy(false);photoGeneration.current++;
    requestId.current=crypto.randomUUID();uploadId.current=crypto.randomUUID();
    setName(item?.name||(value==='settings'?detail?.box.name:'')||'');setDescription(item?.description||(value==='settings'?detail?.box.description:'')||'');setPermission(detail?.box.guestPermission||'VIEW');setPreview(item?photoUrl(item):'');setCopied(false);
    if(value==='qr'&&detail?.box.publicToken){setQr('');QRCode.toDataURL(shareLink(),{width:600,margin:3,errorCorrectionLevel:'M'}).then(setQr).catch(()=>setFormError('qrFailed'));}
  }
  function close(){if(!busy){photoGeneration.current++;setModal(null);}}
  function shareLink(){return `${appUrl}/b/${detail?.box.publicToken}`;}
  async function perform(work:()=>Promise<void>,success:MessageKey){
    if(busy||photoBusy)return;setBusy(true);setFormError('');cleanupPending.current=false;
    try{await work();setModal(null);setNotice(success);setRefresh(v=>v+1);}
    catch(err){setFormError((err as Error).message);}finally{setBusy(false);}
  }
  async function selectPhoto(file?:File){
    if(!file)return;const generation=++photoGeneration.current;setPhotoBusy(true);setFormError('');
    try{const blob=await compressPhoto(file);if(generation!==photoGeneration.current)return;setPhoto(blob);setPhotoRemoved(false);setPreview(URL.createObjectURL(blob));uploadId.current=crypto.randomUUID();}
    catch(err){if(generation===photoGeneration.current)setFormError((err as Error).message);}
    finally{if(generation===photoGeneration.current)setPhotoBusy(false);}
  }
  async function submit(event:FormEvent){event.preventDefault();
    await perform(async()=>{
      if(modal==='box'){const box=await request<BoxView>('/api/boxes','POST',{id:requestId.current,name,description});chooseBox(box.id);}
      if(modal==='settings')await request(base,'PATCH',{name,description,guestPermission:permission,version:detail!.box.version});
      if(modal==='item'){
        let photoId=photoRemoved?null:editing?.photoId||null;
        if(photo){const form=new FormData();form.set('photo',photo,'photo.jpg');form.set('id',uploadId.current);form.set('title',name);photoId=(await request<{id:string}>(`${itemBase}/photos`,'POST',form)).id;}
        const result=await request<{cleanupPending?:boolean}>(`${itemBase}/items${editing?'/'+editing.id:''}`,editing?'PATCH':'POST',{id:editing?.id||requestId.current,name,description,photoId,...(editing?{version:editing.version}:{})});
        cleanupPending.current=Boolean(result.cleanupPending);
      }
    },modal==='box'?'boxCreated':'saved');
  }
  const box=detail?.box,canEdit=detail?.canEdit&&!loading;
  return <>
    <main className="workspace">
      <div className="page-top"><div className="page-heading"><p className="eyebrow">{t(guest?'guestBox':selected?'brandTagline':'catalog')}</p><div className="box-title-row"><h1>{guest?(box?.name||t('openingBox')):selected?(box?.name||t('box')):t('headline')}</h1>{!guest&&selected&&box&&<button className="icon-button title-qr" onClick={()=>open('qr')} aria-label={t('qr')}><QrCode size={25}/></button>}</div><p className="muted">{guest?t('inside'):selected?box?.description:t('lessSearching')}</p></div>{!selected&&!guest&&<span className="hero-box"><Box size={68} strokeWidth={1}/></span>}</div>
      <div className="toolbar">
        {!guest&&selected&&<button className="button" onClick={()=>chooseBox('')}><ArrowLeft size={16}/>{t('myBoxes')}</button>}
        {!guest&&!selected&&<h2>{t('myBoxes')} <span className="count">{boxes.length}</span></h2>}
        <div className="toolbar-actions">
          {!guest&&selected&&box&&<button className="icon-button" onClick={()=>open('settings')} aria-label={t('settings')}><Settings size={18}/></button>}
          {!guest&&!selected&&<button className="button primary" disabled={ordering} onClick={()=>open('box')}><Plus size={17}/>{t('newBox')}</button>}
          {(guest||selected)&&canEdit&&tab==='items'&&<button className="button primary" onClick={()=>open('item')}><Plus size={17}/>{t('addItem')}</button>}
        </div>
      </div>
      {guest&&box&&<div className="access-note"><span className="dot"/>{permissionNames[box.guestPermission]}{box.guestPermission==='EDIT'&&t('guestNote')}</div>}
      {!guest&&selected&&<div className="tabs">{([['items',Box],['activity',History],['removed',ArchiveRestore]] as const).map(([key,Icon])=><button key={key} className={tab===key?'active':''} onClick={()=>{setTab(key);setPage(1);setQuery('');}}><Icon size={15}/>{t(key)}</button>)}</div>}
      {tab!=='activity'&&<div className="search"><Search size={20}/><input ref={searchInput} type="search" aria-label={t('search')} placeholder={t(selected||guest?'searchBox':'searchAll')} value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/>{query&&<button type="button" className="search-clear" aria-label={t('clearSearch')} onClick={clearSearch}><X size={18}/></button>}</div>}
      {error&&<div className="error" role="alert">{localizedError(locale,error)}<button className="button" onClick={()=>setRefresh(v=>v+1)}>{t('retry')}</button></div>}
      {driveWarning&&<div className="error" role="status">{t('driveWarning')}</div>}
      {loading?<div className="empty" role="status"><LoaderCircle className="spinner"/><h3>{t('loading')}</h3></div>:!error&&<>
        {!selected&&!guest&&!query?<SortableBoxes boxes={boxes} disabled={ordering} onOpen={chooseBox} onCreate={()=>open('box')} onReorder={reorderBoxes}/>:
          tab==='activity'?<div className="activity-list">{events.map(e=><article key={e.id}><span className="activity-icon"><History size={18}/></span><div><strong>{Object.hasOwn(messages,e.action)?t(e.action as MessageKey):e.action}</strong>{e.itemName&&<p>{e.itemName}</p>}<small>{t(e.actorType==='GUEST'?'guest':'owner')} · {new Date(e.createdAt).toLocaleString(locale==='uk'?'uk-UA':'en-GB')}</small></div></article>)}</div>:
          <div className="item-grid">{items.map(item=>{
            const editable=tab==='items'&&(!guest||canEdit);
            const searchResult=!selected&&!guest;
            const content=<><div className="item-photo">{item.photoId?<Photo key={photoUrl(item)} src={photoUrl(item)} name={item.name}/>:<PackageOpen size={54} strokeWidth={1}/>}<span className="number">№ {item.number}</span></div><div className="item-body"><small>{item.boxName||box?.name}</small><h3>{item.name}</h3>{item.description&&<p className="item-description">{item.description}</p>}</div></>;
            return <article id={`item-${item.id}`} tabIndex={-1} className={`item-card ${highlighted===item.id?'item-highlighted':''}`} key={item.id}>
              {searchResult?<button className="item-card-main" onClick={()=>openSearchResult(item)} aria-label={t('findInBox',{name:item.name})}>{content}</button>:editable?<button className="item-card-main" onClick={()=>open('item',item)} aria-label={t('editNamed',{name:item.name})}>{content}</button>:<div className="item-card-main">{content}</div>}
              {editable&&!searchResult&&<button className="card-delete" aria-label={t('removeNamed',{name:item.name})} onClick={()=>open('delete-item',item)}><Trash2 size={18}/></button>}
              {tab==='removed'&&!guest&&<div className="removed-actions"><button className="text-button" disabled={busy} onClick={async()=>{setBusy(true);try{await request(`${base}/items/${item.id}/restore`,'POST',{version:item.version});setRefresh(v=>v+1);setNotice('restored');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><ArchiveRestore size={15}/>{t('restore')}</button><button className="text-button danger-outline" disabled={busy} onClick={()=>open('purge-item',item)}>{t('purge')}</button></div>}
            </article>;
          })}</div>}
        {(selected||guest||query)&&total===0&&<div className="empty"><PackageOpen size={42} strokeWidth={1}/><h3>{t(tab==='activity'?'noHistory':tab==='removed'?'noRemoved':query?'noResults':'empty')}</h3><p>{query?t('tryName'):tab==='items'?t('firstItem'):''}</p></div>}
        {(selected||guest||query)&&total>(tab==='activity'?30:24)&&<nav className="pagination" aria-label={t('pages')}><button className="button" disabled={page===1} onClick={()=>setPage(p=>p-1)}>{t('back')}</button><span>{page} / {Math.ceil(total/(tab==='activity'?30:24))}</span><button className="button" disabled={page>=Math.ceil(total/(tab==='activity'?30:24))} onClick={()=>setPage(p=>p+1)}>{t('next')}</button></nav>}
      </>}
      <footer>Smart Box <span>{t('footer')}</span></footer>
      <div className="catalog-legal"><LegalLinks /></div>
    </main>
    <dialog ref={dialog} onCancel={e=>{
      e.preventDefault();
      // File input `cancel` bubbles in Safari. Dismissing its native chooser
      // must never discard the item draft, even if Safari targets the dialog.
      if(e.target!==e.currentTarget||modal==='item')return;
      close();
    }} className={modal==='qr'?'qr-dialog':''}>
      <div className="dialog-heading"><div><p className="eyebrow">SMART BOX</p><h2>{t(modal==='box'?'newBox':modal==='item'?(editing?'editItem':'addItem'):modal==='settings'?'settings':modal==='qr'?'yourQr':modal==='rotate'?'rotateQuestion':modal==='delete-box'?'deleteBoxQuestion':modal==='purge-item'?'purgeQuestion':'removeQuestion')}</h2></div><button className="icon-button" onClick={close} disabled={busy} aria-label={t('close')}><X size={20}/></button></div>
      {formError&&<p className="error" role="alert">{localizedError(locale,formError)}</p>}
      {['box','item','settings'].includes(modal||'')&&<form onSubmit={submit}><fieldset disabled={busy}>
        <label>{t('name')}<input autoFocus required maxLength={modal==='item'?200:100} value={name} onChange={e=>setName(e.target.value)} placeholder={t(modal==='item'?'itemExample':'boxExample')}/></label>
        {modal==='item'&&<><p className="help">{editing?t('number',{number:editing.number}):t('autoNumber')}</p><div className="photo-picker"><label className="photo-editor file-button">
          {photoBusy?<span className="photo-loader" role="status" aria-label={t('processingPhoto')}><LoaderCircle className="spinner" size={28}/></span>:preview?<Photo key={`${requestId.current}:${preview}`} src={preview} name={t('preview')} eager/>:<><ImagePlus size={32}/><span>{t('tapPhoto')}</span><small>{t('optional')}</small></>}
          <input type="file" accept="image/*" aria-label={t(preview?'replacePhoto':'addPhoto')} ref={node=>{
            if(!node)return;
            const stopCancel=(event:Event)=>event.stopPropagation();
            node.addEventListener('cancel',stopCancel);
            return()=>node.removeEventListener('cancel',stopCancel);
          }} onChange={e=>{selectPhoto(e.target.files?.[0]);e.target.value='';}}/>
        </label>{preview&&<button type="button" className="photo-remove" aria-label={t('removePhoto')} onClick={()=>{photoGeneration.current++;setPhotoBusy(false);setPhoto(null);setPhotoRemoved(true);setPreview('');}}><X size={18}/></button>}</div><p className="help">{t('photoStorage')}</p></>}
        <label>{t('description')} <span className="optional">{t('optional')}</span><textarea rows={3} maxLength={modal==='item'?3000:1000} value={description} onChange={e=>setDescription(e.target.value)} placeholder={t('descriptionExample')}/></label>
        {modal==='settings'&&<><label>{t('qrAccess')}<select value={permission} onChange={e=>setPermission(e.target.value as BoxView['guestPermission'])}>{Object.entries(permissionNames).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label><p className="help">{t('accessHelp')}</p><div className="settings-actions"><button type="button" className="button" onClick={()=>open('rotate')}>{t('rotate')}</button><button type="button" className="button danger-outline" onClick={()=>open('delete-box')}>{t('deleteBox')}</button></div></>}
        <div className="dialog-footer"><button type="button" className="button" onClick={close}>{t('cancel')}</button><button className="button primary" disabled={photoBusy||!name.trim()}>{t(busy?'saving':modal==='box'?'createBox':'save')}</button></div>
      </fieldset></form>}
      {modal==='qr'&&<div className="qr-content"><h3>{box?.name}</h3>{qr&&<img src={qr} alt={t('qrNamed',{name:box?.name||''})} width={270} height={270}/>}<p className="muted">{permissionNames[box?.guestPermission||'VIEW']}</p>{box?.guestPermission==='PRIVATE'&&<p className="help">{t('privateHelp')}</p>}<input aria-label={t('boxLink')} readOnly value={shareLink()}/><div className="qr-actions"><button className="button" onClick={async()=>{try{await navigator.clipboard.writeText(shareLink());setCopied(true);}catch{setFormError('copyFailed');}}}>{copied?<Check size={16}/>:<LinkIcon size={16}/>} {t('copy')}</button><a className="button" href={qr} download="smart-box-qr.png">PNG</a><button className="button primary" onClick={()=>window.print()}>{t('print')}</button></div></div>}
      {modal==='delete-item'&&<><p>{t('removeConfirm',{name:editing?.name||''})}</p><p className="help">{t('removeHelp')}</p><Confirm busy={busy} close={close} label={t('remove')} action={()=>perform(async()=>{await request(`${itemBase}/items/${editing!.id}`,'DELETE',{version:editing!.version});},'itemRemoved')}/></>}
      {modal==='purge-item'&&<><p>{t('purgeConfirm',{name:editing?.name||''})}</p><p className="help">{t('purgeHelp')}</p><Confirm busy={busy} close={close} label={t('purge')} action={()=>perform(async()=>{const result=await request<{cleanupPending:boolean}>(`${itemBase}/items/${editing!.id}/permanent`,'DELETE',{version:editing!.version});cleanupPending.current=result.cleanupPending;},'purged')}/></>}
      {modal==='delete-box'&&<><p>{t('deleteBoxConfirm',{name:box?.name||''})}</p><p className="help">{t('deleteBoxHelp')}</p><Confirm busy={busy} close={close} label={t('deleteBox')} action={()=>perform(async()=>{await request(base,'DELETE',{version:box!.version});chooseBox('');},'boxDeleted')}/></>}
      {modal==='rotate'&&<><p>{t('rotateHelp')}</p><Confirm busy={busy} close={close} label={t('rotate')} action={()=>perform(async()=>{await request(`${base}/rotate`,'POST',{version:box!.version});},'rotated')}/></>}
    </dialog>
    {notice&&<div className="toast" role="status"><Check size={18}/>{localizedError(locale,notice)}{cleanupPending.current&&` ${t('cleanupPending')}`}</div>}
  </>;
}
function Confirm({busy,close,label,action}:{busy:boolean;close:()=>void;label:string;action:()=>void}){const {t}=useLanguage();return <div className="dialog-footer"><button className="button" disabled={busy} onClick={close}>{t('cancel')}</button><button className="button danger" disabled={busy} onClick={action}>{busy?t('saving'):label}</button></div>;}
function Photo({src,name,eager=false}:{src:string;name:string;eager?:boolean}){
  const {t}=useLanguage();
  const [status,setStatus]=useState<'loading'|'ready'|'failed'>('loading');
  const image=useRef<HTMLImageElement>(null);
  useEffect(()=>{if(image.current?.complete)setStatus(image.current.naturalWidth>0?'ready':'failed');},[src]);
  return <>{status==='loading'&&<span className="photo-loader" role="status" aria-label={t('loadingPhoto')}><LoaderCircle className="spinner" size={28}/></span>}{status==='failed'?<span className="help">{t('unavailablePhoto')}</span>:<img ref={image} src={src} alt={name} loading={eager?'eager':'lazy'} className={status==='ready'?'':'photo-loading'} onLoad={()=>setStatus('ready')} onError={()=>setStatus('failed')}/>}</>;
}
