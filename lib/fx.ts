export const FX_CURRENCIES = [
  {code:'JPY',name:'日圓',symbol:'¥',example:'10000'},
  {code:'USD',name:'美元',symbol:'US$',example:'100'},
  {code:'VND',name:'越南盾',symbol:'₫',example:'1000000'},
  {code:'THB',name:'泰銖',symbol:'฿',example:'1000'},
  {code:'EUR',name:'歐元',symbol:'€',example:'100'},
] as const;
export type FxCurrency = typeof FX_CURRENCIES[number]['code'];
export const FX_NETWORKS = ['visa','mastercard','jcb'] as const;
export type FxNetwork = typeof FX_NETWORKS[number];
export const FX_NAMES:Record<FxNetwork,string> = {visa:'Visa',mastercard:'Mastercard',jcb:'JCB'};
export type FxQuote = {network:FxNetwork;rate:number|null;date:string|null};
export type FxSnapshot = {currency:FxCurrency;base:'TWD';quotes:FxQuote[];fetchedAt:string|null;sourceUrl:string};
export function isFxCurrency(value:unknown):value is FxCurrency {
  return typeof value==='string'&&FX_CURRENCIES.some(currency=>currency.code===value);
}
export function fxSourceUrl(currency:FxCurrency){return `https://www.twrates.com/card/visa/${currency.toLowerCase()}.html`;}
export function emptyFx(currency:FxCurrency):FxSnapshot {
  return {currency,base:'TWD',quotes:FX_NETWORKS.map(network=>({network,rate:null,date:null})),fetchedAt:null,sourceUrl:fxSourceUrl(currency)};
}
export function fxInput(value:string,max:number):number|null {
  const normalized=value.trim();
  // Accept ordinary decimals or correctly grouped thousands; never coerce blanks into zero.
  if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(normalized))return null;
  const number=Number(normalized.replaceAll(',',''));
  return Number.isFinite(number)&&number>=0&&number<=max?number:null;
}
export function estimateFx(amount:number,rate:number,feePercent:number){
  if(![amount,rate,feePercent].every(Number.isFinite)||amount<0||rate<=0||feePercent<0||feePercent>20)return null;
  const raw=amount*rate;
  const baseCents=Math.round(raw*100+Number.EPSILON*Math.max(1,raw*100));
  const feeCents=Math.round(raw*feePercent+Number.EPSILON*Math.max(1,raw*feePercent));
  if(!Number.isSafeInteger(baseCents+feeCents))return null;
  return {base:baseCents/100,fee:feeCents/100,total:(baseCents+feeCents)/100};
}
export function fxDateAge(date:string,now:Date=new Date()){
  const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei'}).format(now);
  return Math.floor((Date.parse(day+'T00:00:00Z')-Date.parse(date+'T00:00:00Z'))/86400000);
}
export function validFxDate(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const time=Date.parse(value+'T00:00:00Z');
  return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value;
}
export function usableFxQuote(quote:FxQuote):quote is FxQuote&{rate:number;date:string}{
  return typeof quote.rate==='number'&&Number.isFinite(quote.rate)&&quote.rate>0&&typeof quote.date==='string'&&validFxDate(quote.date);
}
export function freshFxSnapshot(value:FxSnapshot,now:Date=new Date()){
  const time=Date.parse(value.fetchedAt??'');
  return Number.isFinite(time)&&time<=now.getTime()+300000&&now.getTime()-time<=172800000;
}
export function canEstimateFx(quote:FxQuote,snapshot:FxSnapshot,now:Date=new Date()){
  return usableFxQuote(quote)&&freshFxSnapshot(snapshot,now)&&fxDateAge(quote.date,now)>=0&&fxDateAge(quote.date,now)<=7;
}
