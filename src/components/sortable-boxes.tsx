'use client';
import { useRef } from 'react';
import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, ExternalLink, Plus } from 'lucide-react';
import type { BoxView } from '@/lib/types';

const labels={VIEW:'лише перегляд',EDIT:'перегляд і редагування',PRIVATE:'лише власник'};
export function SortableBoxes({boxes,disabled,onOpen,onCreate,onReorder}:{boxes:BoxView[];disabled:boolean;onOpen:(id:string)=>void;onCreate:()=>void;onReorder:(boxes:BoxView[],id:string,beforeId:string|null)=>void}) {
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
  return <><p className="help reorder-help">Затисніть картку й перетягніть, щоб змінити порядок.</p><DndContext id="box-order" sensors={sensors} collisionDetection={closestCenter} onDragStart={()=>{suppressClickUntil.current=Infinity;}} onDragCancel={()=>{suppressClickUntil.current=Date.now()+500;}} onDragEnd={finish} accessibility={{screenReaderInstructions:{draggable:'Коротке натискання відкриває коробку. Затисніть картку для перетягування. З клавіатури: пробіл, стрілки, пробіл для збереження або Escape для скасування.'}}}>
    <SortableContext items={boxes.map(box=>box.id)} strategy={rectSortingStrategy}><div className="box-grid">
      {boxes.map((box,index)=><SortableBox key={box.id} box={box} index={index} disabled={disabled} onOpen={open}/>)}
      <button className="box-card create-card" disabled={disabled} onClick={onCreate}><Plus size={30}/><span>Створити коробку</span><small>Знайдімо місце для ваших речей</small></button>
    </div></SortableContext>
  </DndContext></>;
}
function SortableBox({box,index,disabled,onOpen}:{box:BoxView;index:number;disabled:boolean;onOpen:(id:string)=>void}) {
  const {attributes,listeners,setNodeRef,setActivatorNodeRef,transform,transition,isDragging}=useSortable({id:box.id,disabled});
  return <article ref={setNodeRef} data-box-id={box.id} className={`sortable-box ${isDragging?'is-dragging':''}`} style={{transform:CSS.Transform.toString(transform),transition}}>
    <button ref={setActivatorNodeRef} {...attributes} {...listeners} type="button" className={`box-card tone-${index%3}`} disabled={disabled} onContextMenu={event=>event.preventDefault()} onClick={()=>{if(!isDragging)onOpen(box.id);}}><span className="box-symbol"><Box size={36} strokeWidth={1.4}/></span><span className="box-card-name">{box.name}</span><span className="muted">{box.itemCount} речей</span><span className="box-card-access">Доступ за QR: {labels[box.guestPermission]} <ExternalLink size={13}/></span></button>
  </article>;
}
