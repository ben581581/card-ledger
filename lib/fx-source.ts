import {emptyFx,fxDateAge,type FxCurrency,type FxNetwork,type FxSnapshot} from './fx';

const bounds:Record<FxCurrency,[number,number]>={JPY:[.001,10],USD:[1,1000],VND:[.000001,1],THB:[.001,100],EUR:[1,2000]};
function text(html:string){return html.replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|#160);/gi,' ').replace(/\s+/g,' ').trim();}
// Only extract numbers from the comparison table. Remote HTML is never rendered or executed.
export function parseFxPage(html:string,currency:FxCurrency,now:Date=new Date()):FxSnapshot {
  const snapshot=emptyFx(currency);
  if(html.length>524288)throw new Error('Exchange page too large');
  const unit=html.match(/<[^>]+class=["'][^"']*\bheadline-rate-unit\b[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
  if(!unit||text(unit[1])!==`TWD / ${currency}`)throw new Error('Unexpected exchange currency or direction');
  const table=html.match(/<table\b[^>]*\bid=["']table_comparison["'][^>]*>([\s\S]*?)<\/table>/i);
  if(!table)throw new Error('Exchange comparison table missing');
  const seen=new Set<FxNetwork>();
  for(const match of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const cells=[...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(cell=>text(cell[1]));
    if(cells.length<6)continue;
    const network:FxNetwork|undefined=/^visa$/i.test(cells[0])?'visa':/^(?:萬事達|mastercard)$/i.test(cells[0])?'mastercard':/^jcb$/i.test(cells[0])?'jcb':undefined;
    if(!network)continue;
    if(seen.has(network))throw new Error('Duplicate exchange network');
    seen.add(network);
    if(!new RegExp(`\\b${currency}\\b`).test(cells[2])||!/^.*\bTWD$/.test(cells[5]))continue;
    const rateDate=cells[1].match(/^([\d.]+)\s*\((\d{4}-\d{2}-\d{2})\)$/);
    if(!rateDate)continue;
    let rate=Number(rateDate[1]);
    const date=rateDate[2],age=fxDateAge(date,now);
    // The page's Visa calculator has more precision than the displayed eight decimals.
    // Read only a numeric literal, and require agreement with the visible quote.
    if(network==='visa'){
      const literal=html.match(/\bvar\s+to_amt\s*=\s*(\d+(?:\.\d+)?)\s*\*\s*amt_value\s*;/);
      if(literal){const precise=Number(literal[1]);if(Math.abs(precise-rate)>5.001e-9)continue;rate=precise;}
    }
    const time=Date.parse(date+'T00:00:00Z');
    if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==date||age<0||age>31||!Number.isFinite(rate)||rate<bounds[currency][0]||rate>bounds[currency][1])continue;
    snapshot.quotes[snapshot.quotes.findIndex(quote=>quote.network===network)]={network,rate,date};
  }
  if(!snapshot.quotes.some(quote=>quote.rate!==null))throw new Error('No valid exchange quotes');
  snapshot.fetchedAt=now.toISOString();
  return snapshot;
}
