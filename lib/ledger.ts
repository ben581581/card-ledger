export type Card={id:string;name:string;bank:string;closeDay:number;color:string;imageUrl?:string;imageZoom?:number;lookupOnly?:boolean};
export type Campaign={id:string;cardId:string;name:string;kind:'reward'|'spend'|'unlimited';period:'month'|'bill'|'quarter'|'custom';target:number;rate:number;rateLabel?:string;start:string;end:string;notes:string;channels?:string[]};
export type Entry={id:string;cardId:string;date:string;amount:number;note:string;campaignIds:string[];reward:number|null};
export type Ledger={cards:Card[];campaigns:Campaign[];entries:Entry[]};
export const empty:Ledger={cards:[],campaigns:[],entries:[]};
export function today(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei'}).format(new Date());}
function calendar(y:number,m:number,d:number){
 const value=new Date(0);
 // setUTCFullYear also handles years 0000–0099, which Date.UTC treats as 1900–1999.
 value.setUTCFullYear(y,m,d);
 return value;
}
function date(y:number,m:number,d:number){return calendar(y,m,d).toISOString().slice(0,10);}
function closing(y:number,m:number,d:number){return date(y,m,Math.min(d,calendar(y,m+1,0).getUTCDate()));}
function roundInteger(value:number){return Math.round(value+Number.EPSILON*Math.max(1,Math.abs(value)));}
function cents(value:number){return roundInteger(value*100);}
function floorMoney(value:number){
 const scaled=value*100;
 // Correct division noise at exact cent boundaries without rounding a real remainder up.
 return Math.floor(scaled+Number.EPSILON*Math.max(1,Math.abs(scaled)))/100;
}
export function range(c:Campaign,card:Card,on:string){
 if(c.kind==='unlimited')return {start:c.start,end:c.end,active:(!c.start||c.start<=on)&&(!c.end||on<=c.end)};
 const [y,mo]=on.split('-').map(Number);const m=mo-1;let start='',end='';
 if(c.period==='month'){start=date(y,m,1);end=date(y,m+1,0);}
 if(c.period==='quarter'){const q=Math.floor(m/3)*3;start=date(y,q,1);end=date(y,q+3,0);}
 if(c.period==='bill'){const thisClose=closing(y,m,card.closeDay);const shift=on<=thisClose?0:1;end=closing(y,m+shift,card.closeDay);const prev=closing(y,m+shift-1,card.closeDay);const dt=new Date(prev+'T00:00:00Z');dt.setUTCDate(dt.getUTCDate()+1);start=dt.toISOString().slice(0,10);}
 if(c.period==='custom'){start=c.start;end=c.end;}
 if(c.start&&c.start>start)start=c.start;if(c.end&&c.end<end)end=c.end;
 return {start,end,active:start<=on&&on<=end};
}
export function progress(c:Campaign,card:Card,entries:Entry[],on:string){
 const r=range(c,card,on);
 if(c.kind==='unlimited')return {...r,spend:0,value:0,percent:0,remaining:0,spendLimit:null,spendRemaining:null};
 const rows=entries.filter(e=>e.cardId===card.id&&e.campaignIds.includes(c.id)&&e.date>=r.start&&e.date<=r.end);
 // Sum money as cents so decimal purchases cannot leave a phantom cent at the target.
 const spendCents=rows.reduce((sum,e)=>sum+cents(e.amount),0);
 const valueCents=c.kind==='spend'?spendCents:rows.reduce((sum,e)=>sum+(e.reward==null?roundInteger(cents(e.amount)*c.rate/100):cents(e.reward)),0);
 const targetCents=cents(c.target),remainingCents=Math.max(0,targetCents-valueCents);
 const spend=spendCents/100,value=valueCents/100,remaining=remainingCents/100;
 const canConvert=c.kind==='spend'||c.rate>0;
 // Actual rewards consume the cap even when they differ from the configured rate.
 const spendLimit=canConvert?(c.kind==='spend'?targetCents/100:floorMoney(targetCents/c.rate)):null;
 const spendRemaining=canConvert?(c.kind==='spend'?remaining:floorMoney(remainingCents/c.rate)):null;
 return {...r,spend,value,percent:Math.min(100,Math.max(0,targetCents>0?valueCents/targetCents*100:0)),remaining,spendLimit,spendRemaining};
}
