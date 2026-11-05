import {type Card,type Campaign,type Entry,type Ledger,addDays,daysBetween,progress,range,tracksProgress} from './ledger';
import {indexEntriesByCampaign} from './entry-index';

export type Progress=ReturnType<typeof progress>;
export type Status='near'|'open'|'unset'|'full'|'upcoming'|'ended';
export type Row={c:Campaign;card:Card;p:Progress;status:Status;days:number};

// Attention order: what needs a decision first, finished and off-period items last.
const order:Record<Status,number>={near:0,open:1,unset:2,full:3,upcoming:4,ended:5};
export const nearThreshold=80;

export function statusOf(p:Progress,on:string):Status{
 if(!p.active)return p.start&&on<p.start?'upcoming':'ended';
 if(p.spendRemaining===null)return 'unset';
 if(p.remaining===0)return 'full';
 return p.percent>=nearThreshold?'near':'open';
}

/** Days left in the period, counting the viewed day itself. */
export function daysLeft(end:string,on:string){
 if(!end)return Infinity;
 return Math.max(0,Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(on+'T00:00:00Z'))/86400000)+1);
}

export function trackedRows(data:Ledger,on:string,index=indexEntriesByCampaign(data.entries)):Row[]{
 const cards=new Map(data.cards.map(card=>[card.id,card]));
 const rows:Row[]=[];
 for(const c of data.campaigns){
  const card=cards.get(c.cardId);
  if(!card||card.lookupOnly||!tracksProgress(c))continue;
  const p=progress(c,card,index.get(c.id)||[],on);
  rows.push({c,card,p,status:statusOf(p,on),days:daysLeft(p.end,on)});
 }
 const cardOrder=new Map(data.cards.map((card,i)=>[card.id,i]));
 return rows.sort((a,b)=>order[a.status]-order[b.status]
  ||(a.status==='near'||a.status==='open'?b.p.percent-a.p.percent:0)
  ||a.days-b.days
  ||(cardOrder.get(a.card.id)??0)-(cardOrder.get(b.card.id)??0));
}

export function summarize(rows:Row[]){
 const live=rows.filter(r=>r.p.active);
 const rewards=live.filter(r=>r.c.kind==='reward'),goals=live.filter(r=>r.c.kind==='spend');
 // Cents avoid summing float noise across many campaigns.
 const sum=(list:Row[])=>list.reduce((s,r)=>s+Math.round((r.p.spendRemaining??0)*100),0)/100;
 const sumCap=(pick:(r:Row)=>number)=>rewards.reduce((s,r)=>s+Math.round(pick(r)*100),0)/100;
 return {
  live:live.length,
  near:live.filter(r=>r.status==='near').length,
  full:rewards.filter(r=>r.status==='full').length,
  rewards:rewards.length,
  goalsMet:goals.filter(r=>r.status==='full').length,
  goals:goals.length,
  capRoom:sum(rewards.filter(r=>r.status==='open'||r.status==='near')),
  goalGap:sum(goals.filter(r=>r.status!=='full')),
  // Reward money adds up across campaigns; spendable amounts overlap, so they do not.
  earned:sumCap(r=>r.p.earned),
  capTotal:sumCap(r=>r.c.target),
  rewardRoom:sumCap(r=>r.p.remaining),
  over:sumCap(r=>r.p.over),
 };
}

/** The first day a used-up campaign starts counting again. */
export function resetsOn(r:Row){return r.p.end?addDays(r.p.end,1):'';}

export type Pace={kind:'cap';date:string}|{kind:'goal';perDay:number};

/** Straight-line read of the period so far; only speaks up when the answer changes a decision. */
export function pace(r:Row,on:string):Pace|null{
 if(!r.p.active||!r.p.start||!r.p.end||r.p.remaining===0)return null;
 const elapsed=daysBetween(r.p.start,on)+1,left=daysBetween(on,r.p.end)+1;
 if(r.c.kind==='spend')return {kind:'goal',perDay:Math.ceil(r.p.remaining/left)};
 if(elapsed<3||r.p.value<=0)return null;
 const days=Math.ceil(r.p.remaining/(r.p.value/elapsed));
 return days<left?{kind:'cap',date:addDays(on,days)}:null;
}

export function offerActive(c:Campaign,card:Card,on:string){return range(c,card,on).active;}
export function rateText(c:Campaign){return c.kind==='spend'?'滿額活動':c.rateLabel?.trim()||`${c.rate}%`;}
