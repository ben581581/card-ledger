// Finds each catalog card's face on its bank page and stores a small WebP under public/cards/,
// so the 卡庫 shows real cards without hot-linking bank servers at runtime.
// Usage: node scripts/fetch-card-faces.mjs [card-id ...]
// Pages rendered by JavaScript expose no images to a plain fetch: put the image URL found in a
// browser into scripts/card-faces.json ({"card-id":"https://…"}), or null to keep the drawn face, and run again.
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import sharp from 'sharp';

const dataPath='lib/catalog-data.json',overridesPath='scripts/card-faces.json',outDir='public/cards';
const catalog=JSON.parse(readFileSync(dataPath,'utf8'));
const overrides=existsSync(overridesPath)?JSON.parse(readFileSync(overridesPath,'utf8')):{};
const only=new Set(process.argv.slice(2));
const agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const card=1.586;
mkdirSync(outDir,{recursive:true});

async function get(url,referer){
 const response=await fetch(url,{headers:{'User-Agent':agent,'Accept-Language':'zh-TW,zh;q=0.9',...(referer?{Referer:referer}:{})},redirect:'follow',signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`HTTP ${response.status}`);
 return response;
}

/** Every image a page mentions, with whatever text sits next to it. */
function candidates(html,base){
 const found=new Map();
 const add=(raw,hint='')=>{
  if(!raw||raw.startsWith('data:'))return;
  let url;try{url=new URL(raw.replaceAll('&amp;','&').trim(),base).href;}catch{return;}
  if(!/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)&&!/\/-\/media\//i.test(url))return;
  if(/favicon|sprite|qrcode|qr_|\/icon[s]?\/|logo_|_logo|-logo|social|facebook|youtube|instagram|appstore|googleplay/i.test(url))return;
  found.set(url,(found.get(url)||'')+' '+hint);
 };
 for(const m of html.matchAll(/<img\b[^>]*>/gi)){
  const tag=m[0],alt=(tag.match(/\balt=["']([^"']*)/i)||[])[1]||'';
  for(const attr of ['src','data-src','data-original','data-lazy-src'])add((tag.match(new RegExp(`\\b${attr}=["']([^"']+)`,'i'))||[])[1],alt);
  const set=(tag.match(/\b(?:data-)?srcset=["']([^"']+)/i)||[])[1];
  if(set)for(const part of set.split(','))add(part.trim().split(/\s+/)[0],alt);
 }
 for(const m of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)/gi))add(m[1],'og');
 for(const m of html.matchAll(/url\(\s*["']?([^"')]+)/gi))add(m[1]);
 for(const m of html.matchAll(/["'](https?:\/\/[^"'\s]+?\.(?:png|jpe?g|webp))["']/gi))add(m[1]);
 return [...found].map(([url,hint])=>({url,hint}));
}

async function measure(url,referer){
 const response=await get(url,referer);
 const buffer=Buffer.from(await response.arrayBuffer());
 if(buffer.length>4_000_000)throw new Error('too large');
 // Trim transparent or flat margins first: many faces sit on a padded canvas.
 const trimmed=await sharp(buffer,{animated:false}).trim({threshold:12}).toBuffer({resolveWithObject:true}).catch(()=>null);
 const {width,height}=trimmed?trimmed.info:await sharp(buffer).metadata();
 return {buffer:trimmed?trimmed.data:buffer,width,height};
}

const generic=new Set(['card','cards','credit','visa','jcb','signature','titanium','bank','cash','back','esun','fubon','sinopac','cathay','taishin','ctbc','hsbc','kgi','mega','dbs','ubot','feib','hncb','yuanta','scb','rakuten','amex']);
function score({width,height},url,hint,entry){
 const ratio=width/height,portrait=ratio<1;
 const off=Math.abs((portrait?1/ratio:ratio)-card);
 if(off>.12||Math.min(width,height)<120)return -1;
 // Only words that name this card count: a shared "card" folder says nothing.
 const own=entry.id.split('-').filter(w=>w.length>1&&!generic.has(w));
 const text=decodeURIComponent(url+' '+hint).toLowerCase();
 const named=own.some(w=>text.includes(w))||text.includes(entry.name.replace(/\s|卡$/g,'').toLowerCase());
 const promo=/banner|_bn|bn_|kv|hero|carousel|gift|promo|campaign|event|活動|回饋|screenshot|step|app_|index_/i.test(text);
 return 100-off*300+(named?40:0)-(promo?45:0)+Math.min(Math.max(width,height),900)/60-(portrait?8:0);
}

async function face(entry){
 const page=entry.url;
 let list=[];
 if(overrides[entry.id])list=[{url:overrides[entry.id],hint:'override'}];
 else{
  const html=(await (await get(page)).text());
  list=candidates(html,page).slice(0,40);
 }
 let best=null;
 for(const item of list){
  try{
   const image=await measure(item.url,page);
   const value=item.hint==='override'?999:score(image,item.url,item.hint,entry);
   if(value>0&&(!best||value>best.value))best={...image,url:item.url,value};
  }catch{}
 }
 if(!best)return null;
 const portrait=best.width<best.height;
 await sharp(best.buffer).resize(portrait?{height:320,withoutEnlargement:true}:{width:320,withoutEnlargement:true}).webp({quality:82}).toFile(`${outDir}/${entry.id}.webp`);
 return {path:`/cards/${entry.id}.webp`,source:best.url,portrait};
}

let found=0,missing=[];
for(const entry of catalog.cards){
 if(only.size&&!only.has(entry.id))continue;
 // null marks a card whose page has no usable face: keep the drawn one.
 if(overrides[entry.id]===null){delete entry.face;console.log(`-  ${entry.id}: drawn face`);continue;}
 try{
  const result=await face(entry);
  if(result){entry.face=result.path;found++;console.log(`ok ${entry.id} ← ${result.source}${result.portrait?' (portrait)':''}`);}
  else{missing.push(entry.id);console.log(`?  ${entry.id}: no card-shaped image on ${entry.url}`);}
 }catch(error){missing.push(entry.id);console.log(`?  ${entry.id}: ${error.message}`);}
}
writeFileSync(dataPath,JSON.stringify(catalog));
console.log(`\n${found} faces saved, ${missing.length} missing${missing.length?': '+missing.join(' '):''}`);
