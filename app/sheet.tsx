'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {X} from 'lucide-react';

type Props={
 title:string;
 onClose:()=>void;
 children:ReactNode;
 full?:boolean;
 /** Custom left/right bar items (editor: 取消 / 儲存). Defaults to a close button. */
 left?:ReactNode;
 right?:ReactNode;
 locked?:boolean;
};

// Bottom sheet on a native <dialog>: focus trap, Esc, backdrop tap and drag-down to dismiss.
export function Sheet({title,onClose,children,full,left,right,locked}:Props){
 const ref=useRef<HTMLDialogElement>(null),[closing,setClosing]=useState(false);
 const drag=useRef<{y:number;dy:number}|null>(null);
 const lockedRef=useRef(locked);lockedRef.current=locked;
 useEffect(()=>{
  const dialog=ref.current;dialog?.showModal();
  // showModal focuses the first control (取消); hand focus to the field the form marked instead.
  dialog?.querySelector<HTMLElement>('[data-autofocus]')?.focus({preventScroll:true});
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=overflow;};
 },[]);
 function close(){
  if(lockedRef.current||closing)return;
  setClosing(true);setTimeout(onClose,280);
 }
 function move(y:number){
  if(!drag.current||!ref.current)return;
  drag.current.dy=Math.max(0,y-drag.current.y);
  ref.current.style.transform=`translateY(${drag.current.dy}px)`;
 }
 function end(){
  const d=drag.current;drag.current=null;
  if(!ref.current||!d)return;
  ref.current.style.transition='transform .3s cubic-bezier(.32,.72,0,1)';
  if(d.dy>110&&!lockedRef.current){close();ref.current.style.transform='';}
  else ref.current.style.transform='';
  setTimeout(()=>{if(ref.current)ref.current.style.transition='';},300);
 }
 return <dialog ref={ref} className={`sheet${full?' full':''}${closing?' closing':''}`} aria-label={title}
  onCancel={e=>{e.preventDefault();close();}}
  onClick={e=>{if(e.target===ref.current)close();}}>
  <div className="sheet-grab" aria-hidden="true"
   onPointerDown={e=>{drag.current={y:e.clientY,dy:0};e.currentTarget.setPointerCapture(e.pointerId);}}
   onPointerMove={e=>move(e.clientY)} onPointerUp={end} onPointerCancel={end}/>
  <div className="sheet-bar">
   <div className="left">{left}</div>
   <h2>{title}</h2>
   <div className="right">{right??<button className="x" aria-label="關閉" onClick={close}><X size={16} strokeWidth={2.6}/></button>}</div>
  </div>
  <div className="sheet-body">{children}</div>
 </dialog>;
}
