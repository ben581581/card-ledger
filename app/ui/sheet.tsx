'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {X} from 'lucide-react';

type Props={title:string;onClose:()=>void;children:ReactNode;full?:boolean;left?:ReactNode;right?:ReactNode;locked?:boolean};

let open=0;
function track(delta:number){
 const root=document.documentElement;
 if(delta>0&&open===0)root.style.setProperty('--stage-y',`${window.scrollY+window.innerHeight/2}px`);
 open=Math.max(0,open+delta);
 if(open)root.dataset.sheets=String(open);else delete root.dataset.sheets;
}

/**
 * Bottom sheet on a native <dialog>: focus trap and Esc come for free.
 * Dragging works from the handle and the title bar, or from the content once it is scrolled to the top.
 */
export function Sheet({title,onClose,children,full,left,right,locked}:Props){
 const ref=useRef<HTMLDialogElement>(null),body=useRef<HTMLDivElement>(null),[closing,setClosing]=useState(false);
 const lockedRef=useRef(locked);lockedRef.current=locked;
 const closingRef=useRef(false),close=useRef(()=>{});
 close.current=()=>{
  if(lockedRef.current||closingRef.current)return;
  closingRef.current=true;setClosing(true);track(-1);setTimeout(onClose,280);
 };
 useEffect(()=>{
  const dialog=ref.current;if(!dialog)return;
  dialog.showModal();track(1);
  dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus({preventScroll:true});
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=overflow;if(!closingRef.current)track(-1);};
 },[]);
 useEffect(()=>{
  const dialog=ref.current,scroller=body.current;if(!dialog||!scroller)return;
  let startY=0,dy=0,dragging=false,startTime=0;
  const settle=()=>{dialog.style.transition='transform .35s cubic-bezier(.32,.72,0,1)';dialog.style.transform='';setTimeout(()=>{dialog.style.transition='';},350);};
  const start=(e:TouchEvent)=>{startY=e.touches[0].clientY;dy=0;startTime=e.timeStamp;dragging=(e.target as HTMLElement).closest('.sheet-grab,.sheet-bar')!==null;};
  const move=(e:TouchEvent)=>{
   const delta=e.touches[0].clientY-startY;
   if(!dragging&&scroller.scrollTop<=0&&delta>6&&!(e.target as HTMLElement).closest('input,textarea,select,.picker,.chips'))dragging=true;
   if(!dragging)return;
   dy=Math.max(0,delta);
   if(e.cancelable)e.preventDefault();
   dialog.style.transition='none';dialog.style.transform=`translateY(${dy}px)`;
  };
  const end=(e:TouchEvent)=>{
   if(!dragging)return;
   dragging=false;
   const fast=dy/(e.timeStamp-startTime||1)>.55;
   if((dy>120||(fast&&dy>40))&&!lockedRef.current)close.current();else settle();
  };
  dialog.addEventListener('touchstart',start,{passive:true});dialog.addEventListener('touchmove',move,{passive:false});dialog.addEventListener('touchend',end);
  return()=>{dialog.removeEventListener('touchstart',start);dialog.removeEventListener('touchmove',move);dialog.removeEventListener('touchend',end);};
 },[]);
 return <dialog ref={ref} className={`sheet${full?' full':''}${closing?' closing':''}`} aria-label={title}
  onCancel={e=>{e.preventDefault();close.current();}}
  onClick={e=>{if(e.target===ref.current)close.current();}}>
  <div className="sheet-grab" aria-hidden="true"/>
  <div className="sheet-bar">
   <div>{left}</div>
   <h2>{title}</h2>
   <div className="right">{right??<button className="x" aria-label="關閉" onClick={()=>close.current()}><X size={15} strokeWidth={2.6}/></button>}</div>
  </div>
  <div className="sheet-body" ref={body}>{children}</div>
 </dialog>;
}
