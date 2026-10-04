import {Ledger,progress,range} from './ledger';

export function parseChannels(value:string){
 return [...new Set(value.split(/[,，、;；\n]+/).map(s=>s.trim()).filter(Boolean))];
}
const aliases=[['蝦皮','shopee'],['酷澎','coupang'],['全聯','pxmart'],['家樂福','carrefour'],['麥當勞','mcdonalds'],['優食','ubereats']];
export function normalizeChannel(value:string){return value.normalize('NFKC').toLowerCase().replace(/[\s\p{P}]/gu,'');}
export function channelMatches(channel:string,query:string){
 const text=normalizeChannel(channel),term=normalizeChannel(query);
 if(!term)return true;
 const terms=new Set([term]);
 for(const group of aliases){if(group.some(alias=>normalizeChannel(alias)===term))group.forEach(alias=>terms.add(normalizeChannel(alias)));}
 return [...terms].some(alias=>text.includes(alias));
}
export function searchChannels(data:Ledger,query:string,on:string,includeInactive=false){
 return data.cards.map(card=>({card,matches:data.campaigns.filter(c=>c.cardId===card.id&&(c.channels||[]).some(channel=>channelMatches(channel,query))).map(c=>({c,p:progress(c,card,data.entries,on)})).filter(({p})=>includeInactive||p.active)})).filter(result=>result.matches.length>0);
}

// Keep shortcuts useful for comparison, rather than following campaign entry order.
const featuredMerchants=['蝦皮','momo','淘寶','酷澎','Uber Eats','foodpanda','屈臣氏','康是美','全支付','Netflix','高鐵','LINE Pay'];
export function featuredChannels(data:Pick<Ledger,'cards'|'campaigns'>,on:string){
 const cards=new Map(data.cards.map(card=>[card.id,card]));
 const eligible=data.campaigns.filter(c=>{
  const card=cards.get(c.cardId);
  return card&&c.kind!=='spend'&&c.rate>0&&range(c,card,on).active;
 });
 return featuredMerchants.map((channel,order)=>({channel,order,cardCount:new Set(eligible.filter(c=>(c.channels||[]).some(name=>channelMatches(name,channel))).map(c=>c.cardId)).size}))
  .filter(item=>item.cardCount>=2)
  .sort((a,b)=>b.cardCount-a.cardCount||a.order-b.order)
  .map(({channel,cardCount})=>({channel,cardCount}));
}
