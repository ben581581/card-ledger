import type {Entry} from './ledger';

// Build once per ledger update; progress still checks card, period and money rounding.
export function indexEntriesByCampaign(entries:Entry[]){
 const byCampaign=new Map<string,Entry[]>();
 for(const entry of entries){
  for(const id of new Set(entry.campaignIds)){
   const rows=byCampaign.get(id);
   if(rows)rows.push(entry);
   else byCampaign.set(id,[entry]);
  }
 }
 return byCampaign;
}
