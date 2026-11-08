'use client';
import type {ReactNode} from 'react';

type Tone='open'|'near'|'full'|'goal'|'done'|'ghost';
function toneOf(value:number,goal:boolean,done:boolean,ghost:boolean):Tone{
 if(ghost)return 'ghost';
 if(goal)return done?'done':'goal';
 return done?'full':value>=80?'near':'open';
}

/** A hairline drawn like a pen stroke: one quiet colour, and a nib where it stops. */
export function Meter({value,goal=false,done=false,ghost=false,after,label}:{value:number;goal?:boolean;done?:boolean;ghost?:boolean;after?:number;label?:string}){
 const v=Math.max(0,Math.min(100,value))/100;
 const tone=toneOf(value,goal,done,ghost);
 return <div className={`meter t-${tone}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v*100)}>
  {after!==undefined&&<i className="meter-after" aria-hidden="true" style={{'--v':Math.max(0,Math.min(100,after))/100} as React.CSSProperties}/>}
  <i className="meter-fill" style={{'--v':v} as React.CSSProperties}/>
 </div>;
}

/** A single drawn circle, for the moments one number is the whole story. */
export function Dial({value,size=96,kind='reward',children,mini=false}:{value:number;size?:number;kind?:'reward'|'goal';children?:ReactNode;mini?:boolean}){
 const v=Math.max(0,Math.min(100,value));
 const tone=toneOf(v,kind==='goal',v>=100,false);
 const stroke=mini?1.6:2,r=size/2-stroke-1,length=2*Math.PI*r;
 return <div className={`dial-wrap t-${tone}`} style={{width:size,height:size}}>
  <svg className="dial" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
   <circle className="dial-track" cx={size/2} cy={size/2} r={r} strokeWidth={stroke}/>
   <circle className="dial-arc" cx={size/2} cy={size/2} r={r} strokeWidth={stroke} strokeDasharray={length} style={{'--len':length,'--off':length*(1-v/100)} as React.CSSProperties} transform={`rotate(-90 ${size/2} ${size/2})`}/>
  </svg>
  {children&&<div className={`dial-center${mini?' mini':''}`}>{children}</div>}
 </div>;
}
