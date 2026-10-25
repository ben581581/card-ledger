import type {Card,Campaign,progress} from './ledger';

export type OverviewCampaign={c:Campaign;card:Card;p:ReturnType<typeof progress>};
export type CampaignGroup={card:Card;rows:OverviewCampaign[]};

// Completed activities stay with their card, after activities that still need attention.
function priority(row:OverviewCampaign){return !row.p.active?2:row.p.remaining===0?1:0;}
function compareProgress(a:OverviewCampaign,b:OverviewCampaign){
 const tier=priority(a)-priority(b);
 if(tier)return tier;
 if(priority(a)!==0)return 0;
 return b.p.percent-a.p.percent||(a.p.end||'9999-12-31').localeCompare(b.p.end||'9999-12-31');
}

export function groupCampaigns(rows:readonly OverviewCampaign[],cards:readonly Card[]):CampaignGroup[]{
 const groups=new Map<string,CampaignGroup>();
 const cardOrder=new Map(cards.map((card,index)=>[card.id,index]));
 for(const row of rows){
  let group=groups.get(row.card.id);
  if(!group){group={card:row.card,rows:[]};groups.set(row.card.id,group);}
  group.rows.push(row);
 }
 const result=[...groups.values()];
 for(const group of result)group.rows.sort(compareProgress);
 return result.sort((a,b)=>compareProgress(a.rows[0],b.rows[0])||(cardOrder.get(a.card.id)??cards.length)-(cardOrder.get(b.card.id)??cards.length));
}
