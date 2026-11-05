import {type Campaign,type Card,type Entry,type Ledger,progress,range,tracksProgress} from './ledger';
import {channelMatcher,generalScope,scopeApplies} from './channels';
import {indexEntriesByCampaign} from './entry-index';

export type Part={c:Campaign;rate:number;room:number|null;gain:number|null;full:boolean;specific:boolean};
export type Advice={
 card:Card;
 /** Effective rate at this merchant, after caps that are already used up. */
 rate:number;
 /** NT$ this purchase should earn; null until an amount is known. */
 gain:number|null;
 parts:Part[];
 /** Offers that apply here but cannot be added up: conditional, threshold or query-only. */
 extras:Campaign[];
 /** Whether a merchant-specific offer applies, rather than the card's everyday rate. */
 specific:boolean;
 /** How much more can be spent before the tightest cap in play runs out. */
 room:number|null;
 label:string;
};

const round=(n:number)=>Math.round(n*100)/100;

/**
 * What one card earns at one merchant.
 * Flat rates on a card are alternatives (switchable plans), so only the best one counts.
 * Capped offers are add-ons, so they stack until each cap runs out.
 */
export function adviseCard(card:Card,data:Pick<Ledger,'campaigns'>,query:string,amount:number|null,on:string,index:Map<string,Entry[]>):Advice|null{
 const matches=channelMatcher(query);
 const flat:Part[]=[],capped:Part[]=[],extras:Campaign[]=[];
 for(const c of data.campaigns){
  if(c.cardId!==card.id||!range(c,card,on).active)continue;
  const scope=generalScope(c.channels);
  const specific=!!query.trim()&&scope===null&&(c.channels||[]).some(matches);
  if(!specific&&!scopeApplies(scope,query))continue;
  const unverifiable=card.lookupOnly&&c.kind==='reward'&&c.registration?.type==='required';
  if(c.kind==='spend'||c.queryOnly||c.rate<=0||unverifiable){if(specific)extras.push(c);continue;}
  if(c.kind==='unlimited'){
   flat.push({c,rate:c.rate,room:null,gain:amount===null?null:amount*c.rate/100,full:false,specific});
   continue;
  }
  const tracked=!card.lookupOnly&&tracksProgress(c);
  const remaining=tracked?progress(c,card,index.get(c.id)||[],on).remaining:c.target;
  const room=Math.floor(remaining/c.rate*100*100)/100;
  capped.push({c,rate:c.rate,room,gain:amount===null?null:Math.min(amount*c.rate/100,remaining),full:remaining<=0,specific});
 }
 const best=flat.reduce<Part|null>((top,part)=>!top||part.rate>top.rate||(part.rate===top.rate&&part.specific&&!top.specific)?part:top,null);
 const parts=[...(best?[best]:[]),...capped].sort((a,b)=>Number(b.specific)-Number(a.specific)||b.rate-a.rate);
 if(!parts.length&&!extras.length)return null;
 const open=parts.filter(part=>!part.full);
 const gain=amount===null?null:round(parts.reduce((sum,part)=>sum+(part.gain??0),0));
 const rate=amount?round((gain??0)/amount*100):round(open.reduce((sum,part)=>sum+part.rate,0));
 const rooms=open.filter(part=>part.room!==null&&part.specific).map(part=>part.room!);
 const lead=open.find(part=>part.specific)||open[0]||parts[0];
 return {card,rate,gain,parts,extras,specific:parts.some(part=>part.specific)||extras.length>0,room:rooms.length?Math.min(...rooms):null,label:lead?(lead.c.rateLabel?.trim()||''):''};
}

/** Cards ranked by what this purchase would actually earn right now. */
export function advise(data:Ledger,query:string,amount:number|null,on:string,index=indexEntriesByCampaign(data.entries)):Advice[]{
 const results=data.cards.map(card=>adviseCard(card,data,query,amount,on,index)).filter((item):item is Advice=>!!item);
 return results.sort((a,b)=>(b.gain??b.rate)-(a.gain??a.rate)||b.rate-a.rate||Number(b.specific)-Number(a.specific)||(b.room??Infinity)-(a.room??Infinity));
}

export type Suggestion={ids:string[];matched:boolean};

/**
 * Which tracked campaigns a purchase counts towards.
 * A recognised merchant picks its own offers; an unknown note keeps everything
 * in period selected, because the person chose the card knowing where they were.
 */
export function suggestCampaigns(data:Pick<Ledger,'cards'|'campaigns'>,cardId:string,note:string,date:string):Suggestion{
 const card=data.cards.find(item=>item.id===cardId);
 if(!card||!date)return {ids:[],matched:false};
 const live=data.campaigns.filter(c=>c.cardId===cardId&&tracksProgress(c)&&range(c,card,date).active);
 const all=live.map(c=>c.id);
 if(!note.trim())return {ids:all,matched:false};
 const matches=channelMatcher(note);
 const hits=live.filter(c=>generalScope(c.channels)===null&&(c.channels||[]).some(matches));
 if(!hits.length)return {ids:all,matched:false};
 const everyday=live.filter(c=>scopeApplies(generalScope(c.channels),note));
 return {ids:[...new Set([...hits,...everyday].map(c=>c.id))],matched:true};
}

export type Impact={c:Campaign;before:number;after:number;spendLeft:number|null;lost:number};

/** What logging this purchase does to each campaign it counts towards. */
export function impact(data:Pick<Ledger,'campaigns'>,card:Card,ids:string[],amount:number,date:string,index:Map<string,Entry[]>,editing?:string):Impact[]{
 const rows:Impact[]=[];
 for(const c of data.campaigns){
  if(!ids.includes(c.id)||c.cardId!==card.id)continue;
  const entries=(index.get(c.id)||[]).filter(entry=>entry.id!==editing);
  const before=progress(c,card,entries,date);
  const next=progress(c,card,[...entries,{id:'next',cardId:card.id,date,amount,note:'',campaignIds:[c.id],reward:null}],date);
  const lost=c.kind==='reward'&&c.rate>0?Math.max(0,amount-(before.spendRemaining??amount)):0;
  rows.push({c,before:before.percent,after:next.percent,spendLeft:next.spendRemaining,lost:round(lost)});
 }
 return rows;
}
