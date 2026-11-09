import {type Campaign,type Card,type Entry,type Ledger,addDays,daysBetween,range} from './ledger';
import {channelMatcher,generalScope,isOverseas} from './channels';
import type {Registration} from './registration';

export type Perk={
 name:string;rate:number;
 /** Paid on top of the base rate rather than being the total at that merchant. */
 addon?:boolean;
 cap?:number;capPeriod?:'bill'|'month'|'quarter'|'year'|'event';
 /** Perks that draw down one shared cap. */
 pool?:string;
 /** Shown instead of a percentage, for miles. */
 label?:string;
 channels:string[];start:string;end:string;plan?:string;note?:string;reg?:boolean;
};
export type CatalogCard={
 id:string;name:string;bank:string;hue:number;match?:string[];domestic:number;overseas:number;miles?:string;
 fee:number;waiver:string;fxFee:number;income?:number;tags:string[];unit:string;summary:string;perks:Perk[];
 welcome?:string;welcomeEnd?:string;url:string;verified?:'official'|'partial'|'listing';
 /** A thumbnail of the bank's own card face, stored under public/cards/. */
 face?:string;
};
export type Catalog={updatedAt:string;cards:CatalogCard[]};

export const catalogFilters:[string,string][]=[['all','全部'],['nocap','無上限'],['online','網購'],['pay','行動支付'],['overseas','海外'],['japan','日本'],['dining','餐飲'],['travel','旅遊'],['stream','訂閱影音'],['store','超商量販'],['miles','哩程'],['nofee','免年費']];

const squash=(value:string)=>value.toLowerCase().replace(/\s/g,'');
/** The ledger card a catalog entry already corresponds to, if the person holds it. */
export function heldCard(entry:CatalogCard,cards:Card[]){
 const bank=squash(entry.bank).slice(0,2);
 return cards.find(card=>card.catalogId===entry.id)
  ||(entry.match&&cards.find(card=>squash(card.bank).includes(bank)&&entry.match!.some(key=>squash(card.name).includes(squash(key)))));
}

export const perkActive=(perk:Perk,on:string)=>(!perk.start||perk.start<=on)&&(!perk.end||on<=perk.end);

type Budget=Map<string,number>;
function budgetKey(entry:CatalogCard,perk:Perk,day:string){
 const period=perk.capPeriod==='quarter'?`${day.slice(0,4)}Q${Math.floor((Number(day.slice(5,7))-1)/3)}`:perk.capPeriod==='year'?day.slice(0,4):perk.capPeriod==='event'?'all':day.slice(0,7);
 return `${entry.id}|${perk.pool||perk.name}|${period}`;
}

/** The best a catalog card pays at a merchant: its top rate, plus any add-ons, within caps. */
export function catalogAdvice(entry:CatalogCard,query:string,amount:number|null,on:string,budget?:Budget){
 const overseas=isOverseas(query),matches=channelMatcher(query),base=overseas?entry.overseas:entry.domestic;
 const hit=query.trim()?entry.perks.filter(perk=>perkActive(perk,on)&&perk.channels.some(matches)):[];
 const spend=amount??1000;
 const pay=(perk:Perk,rate:number)=>{
  const value=spend*rate/100;
  if(!perk.cap)return value;
  return Math.min(value,Math.max(0,perk.cap-(budget?.get(budgetKey(entry,perk,on))??0)));
 };
 let best:{perk:Perk|null;gain:number;rate:number}={perk:null,gain:spend*base/100,rate:base};
 for(const perk of hit.filter(item=>!item.addon)){
  const gain=pay(perk,perk.rate);
  if(gain>best.gain)best={perk,gain,rate:perk.rate};
 }
 const addons=hit.filter(item=>item.addon).map(perk=>({perk,gain:pay(perk,perk.rate)})).filter(item=>item.gain>0);
 const gain=best.gain+addons.reduce((sum,item)=>sum+item.gain,0);
 return {
  rate:Math.round(gain/spend*10000)/100,gain:Math.round(gain*100)/100,
  perks:[...(best.perk?[best.perk]:[]),...addons.map(item=>item.perk)],
  charge(){
   if(!budget)return;
   const add=(perk:Perk,value:number)=>{const key=budgetKey(entry,perk,on);budget.set(key,(budget.get(key)??0)+value);};
   if(best.perk?.cap)add(best.perk,best.gain);
   for(const item of addons)if(item.perk.cap)add(item.perk,item.gain);
  },
 };
}

/** Cards from the catalog that beat what the person holds at this merchant. */
export function betterAtMerchant(cards:CatalogCard[],held:Card[],query:string,bestRate:number,on:string,limit=3){
 if(!query.trim())return [];
 return cards.filter(entry=>!entry.miles&&!heldCard(entry,held))
  .map(entry=>({entry,...catalogAdvice(entry,query,null,on)}))
  .filter(item=>item.perks.length>0&&item.rate>bestRate)
  .sort((a,b)=>b.rate-a.rate||a.entry.fee-b.entry.fee)
  .slice(0,limit);
}

// A threshold offer with a rate pays out too, so leaving it out would flatter every other card.
const gainOf=(entry:Entry,c:Campaign)=>{
 if(c.rate<=0)return 0;
 return c.kind==='reward'&&entry.reward!==null?entry.reward:entry.amount*c.rate/100;
};

export type WhatIf={entries:number;spend:number;have:number;would:number;uplift:number;annual:number;days:number;wins:number;
 /** Enough history that a yearly figure means something, not one trip multiplied up. */
 reliable:boolean};

/**
 * Replays recent purchases: each one moves to the catalog card only if that card pays more,
 * and the card's monthly caps apply. Nothing here assumes the person changes how they spend.
 */
export function whatIf(entry:CatalogCard,data:Ledger,on:string,windowDays=120):WhatIf|null{
 if(entry.miles)return null;
 const from=addDays(on,-windowDays);
 const rows=data.entries.filter(item=>item.date>=from&&item.date<=on).sort((a,b)=>a.date.localeCompare(b.date));
 if(!rows.length)return null;
 const campaigns=new Map(data.campaigns.map(c=>[c.id,c])),cards=new Map(data.cards.map(c=>[c.id,c]));
 const used=new Map<string,number>(),budget:Budget=new Map();
 let have=0,would=0,spend=0,wins=0;
 for(const row of rows){
  let current=0;
  for(const id of row.campaignIds){
   const c=campaigns.get(id),card=cards.get(row.cardId);
   if(!c||!card)continue;
   let value=gainOf(row,c);
   if(c.kind==='reward'){
    const key=`${c.id}|${range(c,card,row.date).start}`;
    value=Math.min(value,Math.max(0,c.target-(used.get(key)??0)));
    used.set(key,(used.get(key)??0)+value);
   }
   current+=value;
  }
  const offer=catalogAdvice(entry,row.note,row.amount,row.date,budget);
  have+=current;spend+=row.amount;
  if(offer.gain>current){would+=offer.gain;wins++;offer.charge();}
  else would+=current;
 }
 const days=Math.max(30,daysBetween(rows[0].date,on)+1);
 const uplift=would-have;
 return {entries:rows.length,spend:Math.round(spend),have:Math.round(have),would:Math.round(would),uplift:Math.round(uplift),annual:Math.round(uplift*365/days),days,wins,reliable:days>=60&&wins>=3};
}

const capPeriods:Partial<Record<NonNullable<Perk['capPeriod']>,Campaign['period']>>={bill:'bill',month:'month',quarter:'quarter'};

/** Copies a catalog card into the ledger; offers with a cap are tracked, the rest are for lookup. */
export function catalogToLedger(entry:CatalogCard,id:()=>string,closeDay:number,lookupOnly:boolean,on:string):{card:Card;campaigns:Campaign[]}{
 const card:Card={id:id(),name:entry.name,bank:entry.bank,closeDay,color:faceColors(entry.hue)[0],lookupOnly,catalogId:entry.id,...(entry.face?{imageUrl:entry.face}:{})};
 const reminder=(perk:Perk):Registration=>perk.reg?{type:'required',label:'需登錄',details:perk.note||'',url:entry.url.startsWith('https:')?entry.url:undefined}:{type:'verify',label:'請核對條件',details:perk.note||'',url:entry.url.startsWith('https:')?entry.url:undefined};
 const campaigns:Campaign[]=[];
 const everyday=(name:string,rate:number,channels:string[])=>{
  if(rate>0)campaigns.push({id:id(),cardId:card.id,name,kind:'unlimited',period:'month',target:0,rate,start:'',end:'',notes:'',channels});
 };
 if(entry.domestic===entry.overseas)everyday('一般消費',entry.domestic,['國內一般消費','海外一般消費']);
 else{everyday('國內一般消費',entry.domestic,['國內一般消費']);everyday('海外一般消費',entry.overseas,['海外一般消費']);}
 for(const perk of entry.perks){
  if(!perkActive(perk,on)&&perk.end&&perk.end<on)continue;
  const period=perk.capPeriod?capPeriods[perk.capPeriod]:undefined;
  const capped=!!perk.cap&&!!period;
  campaigns.push({id:id(),cardId:card.id,name:perk.name.slice(0,100),kind:capped?'reward':'unlimited',period:period||'month',target:capped?perk.cap!:0,rate:perk.rate,rateLabel:perk.addon?`加碼 ${perk.rate}%`:undefined,start:perk.start,end:perk.end,notes:[perk.plan?`方案：${perk.plan}`:'',perk.note||''].filter(Boolean).join('。').slice(0,500),channels:perk.channels.slice(0,100),registration:reminder(perk)});
 }
 return {card,campaigns};
}

const hsl=(h:number,s:number,l:number)=>{
 const a=s/100*Math.min(l/100,1-l/100);
 const f=(n:number)=>{const k=(n+h/30)%12;return Math.round(255*(l/100-a*Math.max(-1,Math.min(k-3,9-k,1)))).toString(16).padStart(2,'0');};
 return `#${f(0)}${f(8)}${f(4)}`;
};
/** A dark two-stop metal tint, unique per bank so unbranded card faces stay recognisable. */
export function faceColors(hue:number):[string,string]{return [hsl(hue,42,30),hsl((hue+24)%360,38,11)];}

export function headlineRate(entry:CatalogCard,on:string){
 const base=Math.max(entry.domestic,entry.overseas);
 return Math.max(base,...entry.perks.filter(perk=>perkActive(perk,on)&&perk.rate<=30).map(perk=>perk.addon?Math.round((base+perk.rate)*100)/100:perk.rate));
}
