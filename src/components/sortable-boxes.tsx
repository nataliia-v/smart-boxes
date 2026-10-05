'use client';
import { useRef } from 'react';
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, ExternalLink, Plus } from 'lucide-react';
import type { BoxView } from '@/lib/types';
import { useLanguage } from './language';

export function SortableBoxes({boxes,disabled,onOpen,onCreate,onReorder}:{boxes:BoxView[];disabled:boolean;onOpen:(id:string)=>void;onCreate:()=>void;onReorder:(boxes:BoxView[],id:string,beforeId:string|null)=>void}) {
  const {t}=useLanguage();
  const suppressClickUntil=useRef(0);
  // TouchSensor can prevent touchmove after activation without disabling normal
  // scrolling before the long press (PointerSensor + touch-action:none cannot).
  const sensors=useSensors(
    useSensor(MouseSensor,{activationConstraint:{delay:400,tolerance:8}}),
    useSensor(TouchSensor,{activationConstraint:{delay:400,tolerance:8}}),
    useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}),
  );
  function finish({active,over}:DragEndEvent){
    suppressClickUntil.current=Date.now()+500;
    if(disabled||!over||active.id===over.id)return;
    const from=boxes.findIndex(box=>box.id===active.id),to=boxes.findIndex(box=>box.id===over.id);
    if(from<0||to<0)return;
    const ordered=arrayMove(boxes,from,to);
    onReorder(ordered,String(active.id),ordered[to+1]?.id??null);
  }
  function open(id:string){if(Date.now()>suppressClickUntil.current)onOpen(id);}
  return <><p className="help reorder-help">{t('reorderHelp')}</p><DndContext id="box-order" sensors={sensors} collisionDetection={closestCenter} onDragStart={()=>{suppressClickUntil.current=Infinity;}} onDragCancel={()=>{suppressClickUntil.current=Date.now()+500;}} onDragEnd={finish} accessibility={{screenReaderInstructions:{draggable:t('dragInstructions')},announcements:{onDragStart:()=>t('dragStart'),onDragOver:()=>t('dragOver'),onDragEnd:()=>t('dragEnd'),onDragCancel:()=>t('dragCancel')}}}>
    <SortableContext items={boxes.map(box=>box.id)} strategy={rectSortingStrategy}><div className="box-grid">
      {boxes.map((box,index)=><SortableBox key={box.id} box={box} index={index} disabled={disabled} onOpen={open}/>)}
      <button className="box-card create-card" disabled={disabled} onClick={onCreate}><Plus size={30}/><span>{t('createBox')}</span><small>{t('createHint')}</small></button>
    </div></SortableContext>
  </DndContext></>;
}
function SortableBox({box,index,disabled,onOpen}:{box:BoxView;index:number;disabled:boolean;onOpen:(id:string)=>void}) {
  const {t,countItems}=useLanguage();
  const {attributes,listeners,setNodeRef,setActivatorNodeRef,transform,transition,isDragging}=useSortable({id:box.id,disabled});
  return <article ref={setNodeRef} data-box-id={box.id} className={`sortable-box ${isDragging?'is-dragging':''}`} style={{transform:CSS.Transform.toString(transform),transition}}>
    <button ref={setActivatorNodeRef} {...attributes} {...listeners} aria-roledescription={t('box')} type="button" className={`box-card tone-${index%3}`} disabled={disabled} onContextMenu={event=>event.preventDefault()} onClick={()=>{if(!isDragging)onOpen(box.id);}}><span className="box-symbol"><Box size={36} strokeWidth={1.4}/></span><span className="box-card-name">{box.name}</span><span className="muted">{countItems(box.itemCount)}</span><span className="box-card-access">{t('qrAccess')}: {t(box.guestPermission)} <ExternalLink size={13}/></span></button>
  </article>;
}
