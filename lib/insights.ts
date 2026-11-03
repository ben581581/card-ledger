import {type Card,type Campaign,type Entry,type Ledger,progress,range,tracksProgress} from './ledger';
import {searchChannels} from './channels';
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
 return {
  live:live.length,
  near:live.filter(r=>r.status==='near').length,
  full:rewards.filter(r=>r.status==='full').length,
  rewards:rewards.length,
  goalsMet:goals.filter(r=>r.status==='full').length,
  goals:goals.length,
  capRoom:sum(rewards.filter(r=>r.status==='open'||r.status==='near')),
  goalGap:sum(goals.filter(r=>r.status!=='full')),
  earned:rewards.reduce((s,r)=>s+Math.round(r.p.value*100),0)/100,
 };
}

export function periodSpend(entries:Entry[],start:string,end:string,cardId?:string){
 return entries.filter(e=>e.date>=start&&e.date<=end&&(!cardId||e.cardId===cardId)).reduce((s,e)=>s+Math.round(e.amount*100),0)/100;
}

export type Offer={c:Campaign;card:Card;p:Progress;usable:boolean;tracked:boolean};

/** Whether a card has room left for this offer right now. Query-only and unlimited offers have no ledger cap. */
function usable(c:Campaign,card:Card,p:Progress){
 if(!p.active)return false;
 if(card.lookupOnly||!tracksProgress(c))return true;
 return c.kind==='spend'||p.remaining>0;
}

/** Flattened, ranked answers to "which card should I use here?" */
export function rankOffers(data:Ledger,query:string,on:string,includeInactive=false,index=indexEntriesByCampaign(data.entries)):Offer[]{
 const offers=searchChannels(data,query,on,includeInactive,index).flatMap(({card,matches})=>matches.map(({c,p})=>({c,card,p,usable:usable(c,card,p),tracked:!card.lookupOnly&&tracksProgress(c)})));
 return offers.sort((a,b)=>Number(b.usable)-Number(a.usable)
  ||Number(a.c.kind==='spend')-Number(b.c.kind==='spend')
  ||b.c.rate-a.c.rate
  ||(b.p.spendRemaining??Infinity)-(a.p.spendRemaining??Infinity));
}

export function offerActive(c:Campaign,card:Card,on:string){return range(c,card,on).active;}
export function rateText(c:Campaign){return c.kind==='spend'?'滿額活動':c.rateLabel?.trim()||`${c.rate}%`;}
