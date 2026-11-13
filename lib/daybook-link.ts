import {timingSafeEqual} from 'node:crypto';
import {database} from './db';
import {empty,type Ledger} from './ledger';
import {readLocal,usesLocalStore,writeLocal} from './local-store';
import {suggestCampaigns} from './advise';

// Daybook records a purchase once and, when a card was chosen, files a copy here.
// Its entries carry this prefix so the two apps never fight over the same row.
export const linkedId=(id:string)=>`daybook-${id}`;
export type LinkedInput={id:string;cardId:string;date:string;amount:number;note:string};

/** Adds or replaces Daybook's copy of a purchase; null when the card is not one that tracks spending. */
export function upsertLinked(data:Ledger,input:LinkedInput):Ledger|null{
 const card=data.cards.find(c=>c.id===input.cardId&&!c.lookupOnly);
 if(!card)return null;
 const id=linkedId(input.id),existing=data.entries.find(e=>e.id===id);
 // Offers picked by hand in CARDI survive an amount edit; a new card, merchant or date is matched afresh.
 const keep=!!existing&&existing.cardId===input.cardId&&existing.note===input.note&&existing.date===input.date;
 const entry={id,cardId:input.cardId,date:input.date,amount:input.amount,note:input.note,
  campaignIds:keep?existing!.campaignIds:suggestCampaigns(data,input.cardId,input.note,input.date).ids,reward:keep?existing!.reward:null};
 return {...data,entries:existing?data.entries.map(e=>e.id===id?entry:e):[...data.entries,entry]};
}
export function removeLinked(data:Ledger,id:string):Ledger{
 const target=linkedId(id);
 return data.entries.some(e=>e.id===target)?{...data,entries:data.entries.filter(e=>e.id!==target)}:data;
}

export function linkAuthorized(request:Request){
 const secret=process.env.DAYBOOK_LINK_SECRET||'';
 if(secret.length<32)return false;
 const expected=Buffer.from(`Bearer ${secret}`),received=Buffer.from(request.headers.get('authorization')||'');
 return expected.length===received.length&&timingSafeEqual(expected,received);
}

export async function readLedger():Promise<{data:Ledger;revision:number}>{
 if(usesLocalStore()){const stored=readLocal();return {data:stored.data,revision:stored.revision};}
 const rows=await database()`SELECT payload,revision FROM ledgers WHERE id = 'shared'`;
 return rows[0]?{data:rows[0].payload as Ledger,revision:Number(rows[0].revision)}:{data:empty,revision:0};
}
async function write(data:Ledger,revision:number){
 if(usesLocalStore())return !!writeLocal(data,revision);
 const sql=database();
 const results=await sql.transaction([sql`INSERT INTO ledgers (id,payload,revision) VALUES ('shared',${JSON.stringify(empty)}::jsonb,0) ON CONFLICT (id) DO NOTHING`,
  sql`UPDATE ledgers SET payload = ${JSON.stringify(data)}::jsonb, revision = revision + 1, updated_at = now() WHERE id = 'shared' AND revision = ${revision} RETURNING revision`]);
 return results[1].length>0;
}

/** Applies a change to the shared ledger, retrying when someone saved in between. */
export async function changeLedger(change:(data:Ledger)=>Ledger|null):Promise<'saved'|'unchanged'|'rejected'|'busy'>{
 for(let attempt=0;attempt<4;attempt++){
  const {data,revision}=await readLedger();
  const next=change(data);
  if(!next)return 'rejected';
  if(next===data)return 'unchanged';
  if(await write(next,revision))return 'saved';
 }
 return 'busy';
}
