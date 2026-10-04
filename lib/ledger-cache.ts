import type {Ledger} from './ledger';

export type LedgerSnapshot={data:Ledger;revision:number;updatedAt:string|null};
export const ledgerCacheKey='cardi-ledger-v1';
const strings=(value:unknown):value is string[]=>Array.isArray(value)&&value.every(x=>typeof x==='string');
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object';
// A corrupt/older local snapshot must never prevent a fresh cloud read.
export function validSnapshot(value:unknown):value is LedgerSnapshot{
 if(!object(value)||!Number.isSafeInteger(value.revision)||Number(value.revision)<0||!(value.updatedAt===null||typeof value.updatedAt==='string')||!object(value.data))return false;
 const {cards,campaigns,entries}=value.data;
 return Array.isArray(cards)&&cards.every(c=>object(c)&&typeof c.id==='string'&&typeof c.name==='string'&&typeof c.bank==='string'&&typeof c.color==='string'&&Number.isInteger(c.closeDay)&&Number(c.closeDay)>=1&&Number(c.closeDay)<=31&&(c.imageUrl===undefined||typeof c.imageUrl==='string'))&&
 Array.isArray(campaigns)&&campaigns.every(c=>object(c)&&['id','cardId','name','start','end','notes'].every(k=>typeof c[k]==='string')&&['reward','spend','unlimited'].includes(String(c.kind))&&['month','bill','quarter','custom'].includes(String(c.period))&&typeof c.target==='number'&&Number.isFinite(c.target)&&typeof c.rate==='number'&&Number.isFinite(c.rate)&&(c.rateLabel===undefined||typeof c.rateLabel==='string')&&(c.channels===undefined||strings(c.channels)))&&
 Array.isArray(entries)&&entries.every(e=>object(e)&&['id','cardId','date','note'].every(k=>typeof e[k]==='string')&&typeof e.amount==='number'&&Number.isFinite(e.amount)&&strings(e.campaignIds)&&(e.reward===null||(typeof e.reward==='number'&&Number.isFinite(e.reward))));
}
export function readLedgerCache(storage:Pick<Storage,'getItem'>):LedgerSnapshot|null{
 try{const raw=storage.getItem(ledgerCacheKey);if(!raw)return null;const value:unknown=JSON.parse(raw);return validSnapshot(value)?value:null;}catch{return null;}
}
export function writeLedgerCache(storage:Pick<Storage,'setItem'>,value:LedgerSnapshot){
 try{storage.setItem(ledgerCacheKey,JSON.stringify(value));}catch{/* Private mode/quota failures do not block cloud saves. */}
}
