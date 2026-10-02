export type Card={id:string;name:string;bank:string;closeDay:number;color:string};
export type Campaign={id:string;cardId:string;name:string;kind:'reward'|'spend';period:'month'|'bill'|'quarter'|'custom';target:number;rate:number;start:string;end:string;notes:string};
export type Entry={id:string;cardId:string;date:string;amount:number;note:string;campaignIds:string[];reward:number|null};
export type Ledger={cards:Card[];campaigns:Campaign[];entries:Entry[]};
export const empty:Ledger={cards:[],campaigns:[],entries:[]};
export function today(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei'}).format(new Date());}
function date(y:number,m:number,d:number){return new Date(Date.UTC(y,m,d)).toISOString().slice(0,10);}
function closing(y:number,m:number,d:number){return date(y,m,Math.min(d,new Date(Date.UTC(y,m+1,0)).getUTCDate()));}
export function range(c:Campaign,card:Card,on:string){
 const [y,mo]=on.split('-').map(Number);const m=mo-1;let start='',end='';
 if(c.period==='month'){start=date(y,m,1);end=date(y,m+1,0);}
 if(c.period==='quarter'){const q=Math.floor(m/3)*3;start=date(y,q,1);end=date(y,q+3,0);}
 if(c.period==='bill'){const thisClose=closing(y,m,card.closeDay);const shift=on<=thisClose?0:1;end=closing(y,m+shift,card.closeDay);const prev=closing(y,m+shift-1,card.closeDay);const dt=new Date(prev+'T00:00:00Z');dt.setUTCDate(dt.getUTCDate()+1);start=dt.toISOString().slice(0,10);}
 if(c.period==='custom'){start=c.start;end=c.end;}
 if(c.start&&c.start>start)start=c.start;if(c.end&&c.end<end)end=c.end;
 return {start,end,active:start<=on&&on<=end};
}
export function progress(c:Campaign,card:Card,entries:Entry[],on:string){const r=range(c,card,on);const rows=entries.filter(e=>e.cardId===card.id&&e.campaignIds.includes(c.id)&&e.date>=r.start&&e.date<=r.end);const spend=rows.reduce((s,e)=>s+e.amount,0);const value=c.kind==='spend'?spend:rows.reduce((s,e)=>s+(e.reward??Math.round(e.amount*c.rate)/100),0);return {...r,spend,value,percent:Math.min(100,Math.max(0,value/c.target*100)),remaining:Math.max(0,c.target-value)};}
