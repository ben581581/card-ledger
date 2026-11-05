// Checks lib/catalog-data.json against the banks: fetches each card's page and reports
// any rate that no longer appears there. Pages rendered by JavaScript come back nearly
// empty and are reported as "not readable"; open those in a browser instead.
// Usage: npm run catalog:verify
import {readFileSync} from 'node:fs';

const {cards,updatedAt}=JSON.parse(readFileSync('lib/catalog-data.json','utf8'));
const agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const visible=html=>html.replace(/<script[^]*?<\/script>/gi,' ').replace(/<style[^]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const hasRate=(html,rate)=>new RegExp(`(^|[^\\d.])${String(rate).replace('.','\\.')}\\s*%`).test(html);

console.log(`Catalog last checked ${updatedAt}; ${cards.length} cards\n`);
let changed=0,unreadable=0;
for(const card of cards){
 let html='',status='';
 try{
  const response=await fetch(card.url,{headers:{'User-Agent':agent,'Accept-Language':'zh-TW,zh;q=0.9'},redirect:'follow',signal:AbortSignal.timeout(20000)});
  status=response.status;html=(await response.text()).replaceAll('％','%');
 }catch(error){status=error.cause?.code||error.message;}
 const label=`${card.bank} ${card.name}`;
 if(status!==200||visible(html).length<1000){unreadable++;console.log(`?  ${label}: not readable (${status})`);}
 else{
  const rates=[...new Set([card.domestic,card.overseas,...card.perks.filter(perk=>!perk.label).map(perk=>perk.rate)].filter(rate=>rate>0))];
  const missing=rates.filter(rate=>!hasRate(html,rate));
  if(missing.length){changed++;console.log(`!  ${label}: ${missing.join('%, ')}% not on page — ${card.url}`);}
  else console.log(`ok ${label}`);
 }
 await pause(900);
}
console.log(`\n${changed} to review, ${unreadable} not readable`);
