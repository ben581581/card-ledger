'use client';
import {useEffect,useRef} from 'react';
import {whole} from '../format';

/** A number that rolls to its new value instead of snapping. */
export function Num({value,format=whole,className}:{value:number;format?:(n:number)=>string;className?:string}){
 const ref=useRef<HTMLSpanElement>(null),shown=useRef(0);
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  const from=shown.current;shown.current=value;
  if(from===value||matchMedia('(prefers-reduced-motion:reduce)').matches){el.textContent=format(value);return;}
  const start=performance.now(),duration=720;let frame=0;
  const step=(now:number)=>{
   const t=Math.min(1,(now-start)/duration),eased=1-(1-t)**4;
   el.textContent=format(from+(value-from)*eased);
   if(t<1)frame=requestAnimationFrame(step);
  };
  frame=requestAnimationFrame(step);
  return()=>cancelAnimationFrame(frame);
 },[value,format]);
 return <span ref={ref} className={className}>{format(value)}</span>;
}
