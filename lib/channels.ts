import {type Ledger,range} from './ledger';

export function parseChannels(value:string){
 return [...new Set(value.split(/[,，、;；\n]+/).map(s=>s.trim()).filter(Boolean))];
}
export function normalizeChannel(value:string){return value.normalize('NFKC').toLowerCase().replace(/[\s\p{P}]/gu,'');}

// Same merchant, different spelling.
const aliases=[
 ['蝦皮','shopee'],['酷澎','coupang'],['全聯','pxmart'],['家樂福','carrefour'],['麥當勞','mcdonalds'],['優食','ubereats'],
 ['好市多','costco'],['統一超商','7-11','711','小七','7eleven'],['全家','familymart'],['星巴克','starbucks'],
 ['屈臣氏','watsons'],['康是美','cosmed'],['寶雅','poya'],['網飛','netflix'],['迪士尼','disney'],['任天堂','nintendo','switch'],
 ['playstation','play station','ps5'],['chatgpt','gpt','openai'],['街口','jkopay'],['全支付','pxpay'],['linepay','line pay'],
 ['applepay','apple pay'],['googlepay','google pay'],['appstore','app store'],['亞馬遜','amazon'],['博客來','books'],
 ['日本','日韓','日幣','日圓','東京','大阪','京都','福岡','沖繩','北海道'],
 ['韓國','日韓','韓元','韓圜','韓幣','首爾','釜山'],
 ['泰國','日韓泰','泰銖','曼谷','清邁'],
].map(group=>group.map(normalizeChannel));

// A merchant belongs to a category; catalog perks are often described by the category alone.
const categories=Object.entries({
 網購:['蝦皮','shopee','momo','pchome','酷澎','coupang','淘寶','亞馬遜','amazon','東森','yahoo','friday','樂天','iherb','博客來','小三美日'],
 外送:['ubereats','優食','foodpanda'],
 超商:['統一超商','711','全家','familymart','萊爾富','ok超商'],
 餐飲:['麥當勞','mcdonalds','肯德基','摩斯','星巴克','路易莎','餐廳','西堤','王品','瓦城','鼎泰豐','壽司','火鍋','牛排'],
 串流:['netflix','網飛','spotify','disney','迪士尼','youtube','kkbox','kktv'],
 'AI 工具':['chatgpt','gemini','claude','copilot'],
 遊戲:['steam','nintendo','任天堂','playstation','xbox','appstore','googleplay'],
 行動支付:['applepay','googlepay','samsungpay','linepay','街口','全支付','台灣pay','icashpay','pi拍錢包'],
 加油:['中油','台塑石油','台亞','全國加油','福懋'],
 交通:['高鐵','台鐵','uber','計程車','捷運','悠遊卡','一卡通'],
 旅遊:['機票','booking','agoda','klook','kkday','tripcom','hotelscom','雄獅','易遊網','飯店','訂房'],
 百貨:['新光三越','遠百','遠東百貨','sogo','微風','漢神','統一時代'],
 藥妝:['屈臣氏','康是美','寶雅'],
 保費:['保險','壽險','產險'],
}).map(([name,members])=>[normalizeChannel(name),members.map(normalizeChannel)] as const);

const overseasWords=['海外','國外','日本','韓國','泰國','日韓','新加坡','美國','歐洲','英國','法國','德國','義大利','香港','澳門','越南','菲律賓','馬來西亞','印尼','中國','澳洲','加拿大'].map(normalizeChannel);

/** Every spelling and category a query or a spending note can be reached by. */
export function channelTerms(query:string){
 const term=normalizeChannel(query);
 if(!term)return [];
 const terms=new Set([term]);
 for(const group of aliases)if(group.some(alias=>alias===term||(alias.length>=2&&term.includes(alias))))group.forEach(alias=>terms.add(alias));
 for(const [name,members] of categories){
  if(name===term)members.forEach(member=>terms.add(member));
  else if(members.some(member=>terms.has(member)||term.includes(member)))terms.add(name);
 }
 return [...terms];
}
function channelMatcher(query:string){
 const terms=channelTerms(query),whole=normalizeChannel(query);
 return (channel:string)=>{
  if(!terms.length)return true;
  const text=normalizeChannel(channel);
  // Notes run longer than channel names: 「日本唐吉訶德」should still reach 「唐吉訶德」.
  return terms.some(term=>text.includes(term))||(text.length>=2&&whole.includes(text));
 };
}
export function channelMatches(channel:string,query:string){return channelMatcher(query)(channel);}
export {channelMatcher};
export function isOverseas(query:string){
 const term=normalizeChannel(query);
 return !!term&&overseasWords.some(word=>term.includes(word));
}

/** A campaign with no merchant list, or one worded as ordinary spending, applies everywhere. */
export type Scope='all'|'domestic'|'overseas';
export function generalScope(channels?:string[]):Scope|null{
 if(!channels?.length)return 'all';
 let domestic=false,overseas=false;
 for(const channel of channels){
  const text=normalizeChannel(channel);
  if(/^(國內外)?一般消費/.test(text))return 'all';
  if(text.startsWith('國內一般消費'))domestic=true;
  if(/^(其他)?(海外|國外)一般消費/.test(text))overseas=true;
 }
 return domestic&&overseas?'all':domestic?'domestic':overseas?'overseas':null;
}
export function scopeApplies(scope:Scope|null,query:string){
 if(!scope)return false;
 if(scope==='all')return true;
 return (scope==='overseas')===isOverseas(query);
}

// Keep shortcuts useful for comparison, rather than following campaign entry order.
const featuredMerchants=['蝦皮','momo','淘寶','酷澎','Uber Eats','foodpanda','屈臣氏','康是美','全支付','Netflix','高鐵','LINE Pay','麥當勞','日本','韓國'];
export function featuredChannels(data:Pick<Ledger,'cards'|'campaigns'>,on:string){
 const cards=new Map(data.cards.map(card=>[card.id,card]));
 const eligible=data.campaigns.filter(c=>{
  const card=cards.get(c.cardId);
  return card&&c.kind!=='spend'&&c.rate>0&&range(c,card,on).active;
 });
 return featuredMerchants.map((channel,order)=>{const matchesChannel=channelMatcher(channel);return {channel,order,cardCount:new Set(eligible.filter(c=>(c.channels||[]).some(matchesChannel)).map(c=>c.cardId)).size};})
  .filter(item=>item.cardCount>=2)
  .sort((a,b)=>b.cardCount-a.cardCount||a.order-b.order)
  .map(({channel,cardCount})=>({channel,cardCount}));
}
