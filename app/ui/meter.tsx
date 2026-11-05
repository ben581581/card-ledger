'use client';
import type {ReactNode} from 'react';

/** Tick bar. Colours are pinned to the scale, so amber and red have to be earned. */
export function Meter({value,goal=false,done=false,ghost=false,after,label}:{value:number;goal?:boolean;done?:boolean;ghost?:boolean;after?:number;label?:string}){
 const v=Math.max(0,Math.min(100,value))/100;
 const state=done?(goal?' is-done':' is-full'):'';
 return <div style={{position:'relative'}}>
  <div className={`meter${goal?' goal':''}${state}${ghost?' ghost':''}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v*100)}>
   <i style={{'--v':v} as React.CSSProperties}/>
  </div>
  {after!==undefined&&<div className="meter after" aria-hidden="true"><i style={{'--v':Math.max(0,Math.min(100,after))/100} as React.CSSProperties}/></div>}
 </div>;
}

const mix=(a:number[],b:number[],t:number)=>a.map((n,i)=>Math.round(n+(b[i]-n)*t));
const stops:Record<'reward'|'goal',[number,number[]][]>={
 reward:[[0,[74,222,159]],[.6,[74,222,159]],[.84,[255,179,64]],[1,[255,95,87]]],
 goal:[[0,[76,130,247]],[.62,[111,177,255]],[1,[127,227,196]]],
};
function tickColor(at:number,kind:'reward'|'goal'){
 const scale=stops[kind];
 for(let i=1;i<scale.length;i++)if(at<=scale[i][0]){
  const [from,a]=scale[i-1],[to,b]=scale[i];
  return `rgb(${mix(a,b,(at-from)/(to-from||1)).join(' ')})`;
 }
 return `rgb(${scale.at(-1)![1].join(' ')})`;
}

/** The same scale wrapped around a dial, for the moments a single number is the whole story. */
export function Dial({value,size=96,kind='reward',children,mini=false}:{value:number;size?:number;kind?:'reward'|'goal';children?:ReactNode;mini?:boolean}){
 const count=60,lit=Math.round(Math.max(0,Math.min(100,value))/100*count),c=size/2,outer=c-2,inner=outer-Math.max(6,size*.075);
 return <div className="dial-wrap" style={{width:size,height:size}}>
  <svg className="dial" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
   {Array.from({length:count},(_,i)=>{
    const a=(i*6-90)*Math.PI/180,on=i<lit;
    return <line key={i} className={on?'on':'off'} x1={c+inner*Math.cos(a)} y1={c+inner*Math.sin(a)} x2={c+outer*Math.cos(a)} y2={c+outer*Math.sin(a)} style={on?{stroke:tickColor(i/count,kind),'--i':i} as React.CSSProperties:undefined}/>;
   })}
  </svg>
  {children&&<div className={`dial-center${mini?' mini':''}`}>{children}</div>}
 </div>;
}
