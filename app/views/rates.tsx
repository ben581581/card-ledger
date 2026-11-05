'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,ChevronDown,Info,RefreshCw} from 'lucide-react';
import {FX_CURRENCIES,FX_NAMES,FX_NETWORKS,canEstimateFx,estimateFx,fxDateAge,fxInput,fxSourceUrl,usableFxQuote,type FxCurrency,type FxSnapshot} from '../../lib/fx';
import type {Ledger} from '../../lib/ledger';
import {advise} from '../../lib/advise';
import {indexEntriesByCampaign} from '../../lib/entry-index';
import {CardArt} from '../ui/card-art';
import {money as plainMoney,rate as rateNumber} from '../format';

const money=new Intl.NumberFormat('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2});
const rateFormat=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:6});
const official={visa:'https://www.visa.com.tw/support/consumer/travel-support/exchange-rate-calculator.html',mastercard:'https://www.mastercard.com/global/en/personal/get-support/convert-currency.html',jcb:'https://www.specialoffers.jcb/zh-tw/services/other/rate/'};
const places:Record<FxCurrency,[string,string]>={JPY:['🇯🇵','日本'],KRW:['🇰🇷','韓國'],THB:['🇹🇭','泰國'],USD:['🇺🇸','美國'],EUR:['🇪🇺','歐洲'],HKD:['🇭🇰','香港'],SGD:['🇸🇬','新加坡'],VND:['🇻🇳','越南'],GBP:['🇬🇧','英國'],CNY:['🇨🇳','中國'],AUD:['🇦🇺','澳洲']};

export function RatesView({data,today}:{data:Ledger;today:string}){
 const [currency,setCurrency]=useState<FxCurrency>(()=>{try{const v=localStorage.getItem('cardi-fx-currency');return FX_CURRENCIES.some(c=>c.code===v)?v as FxCurrency:'JPY';}catch{return 'JPY';}});
 const [amount,setAmount]=useState<string>(()=>FX_CURRENCIES.find(c=>c.code===currency)!.example),[fee,setFee]=useState(()=>{try{return localStorage.getItem('cardi-fx-fee')||'1.5';}catch{return '1.5';}});
 const [snapshots,setSnapshots]=useState<Partial<Record<FxCurrency,FxSnapshot>>>({});
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[about,setAbout]=useState(false);
 const [clock,setClock]=useState(()=>new Date());
 useEffect(()=>{
  const tick=()=>setClock(new Date());const timer=setInterval(tick,60000);
  window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);
  return()=>{clearInterval(timer);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick);};
 },[]);
 useEffect(()=>{try{localStorage.setItem('cardi-fx-currency',currency);localStorage.setItem('cardi-fx-fee',fee);}catch{}},[currency,fee]);
 useEffect(()=>{
  const controller=new AbortController();let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},14000);
  setLoading(true);setError('');
  fetch(`/api/exchange-rates?currency=${currency}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{
   if(!response.ok)throw new Error();
   const snapshot=await response.json() as FxSnapshot;
   if(snapshot.currency!==currency||snapshot.base!=='TWD'||!Array.isArray(snapshot.quotes)||!snapshot.quotes.some(usableFxQuote))throw new Error();
   setSnapshots(prev=>({...prev,[currency]:snapshot}));setLoading(false);
  }).catch(()=>{
   if(controller.signal.aborted&&!timedOut)return;
   setError(timedOut?'讀取逾時，請稍後再試。':'目前無法取得最新匯率，可稍後重試或開啟來源頁。');setLoading(false);
  }).finally(()=>clearTimeout(timer));
  return()=>{clearTimeout(timer);controller.abort();};
 },[currency,attempt]);

 const meta=FX_CURRENCIES.find(c=>c.code===currency)!,snapshot=snapshots[currency];
 const parsedAmount=fxInput(amount,10000000000),parsedFee=fxInput(fee,20);
 const quotes=snapshot?.quotes.filter(usableFxQuote)??[];
 const sameDay=new Set(quotes.map(q=>q.date)).size===1;
 const stale=quotes.some(q=>fxDateAge(q.date,clock)>3)||(!!snapshot?.fetchedAt&&clock.getTime()-Date.parse(snapshot.fetchedAt)>86400000);
 const rows=FX_NETWORKS.map(network=>{
  const quote=snapshot?.quotes.find(q=>q.network===network);
  const usable=!!quote&&usableFxQuote(quote);
  const current=!!quote&&!!snapshot&&canEstimateFx(quote,snapshot,clock);
  const estimate=current&&parsedAmount!==null&&parsedFee!==null?estimateFx(parsedAmount,quote!.rate!,parsedFee):null;
  return {network,quote,usable,current,estimate};
 });
 const priced=rows.filter(r=>r.estimate);
 // Only crown a cheapest network when every quote is from the same day.
 const winner=sameDay&&priced.length>1?priced.reduce((a,b)=>b.estimate!.total<a.estimate!.total?b:a).network:null;
 const twd=priced.length?priced.reduce((a,b)=>b.estimate!.base<a.estimate!.base?b:a).estimate!:null;
 const index=useMemo(()=>indexEntriesByCampaign(data.entries),[data.entries]);
 const place=places[currency][1];
 const picks=useMemo(()=>advise(data,place,twd?.base??null,today,index).filter(a=>a.rate>0).slice(0,3),[data,place,twd?.base,today,index]);

 return <div className="view">
  <div className="chips" style={{marginTop:0}} role="group" aria-label="幣別">{FX_CURRENCIES.map(c=><button key={c.code} className="chip" aria-pressed={currency===c.code} onClick={()=>{setCurrency(c.code);setAmount(c.example);}}><span aria-hidden="true">{places[c.code][0]}</span>{c.name}</button>)}</div>

  <section className="fx-input" style={{marginTop:12}}>
   <label htmlFor="fx-amount">在{place}刷卡 · {meta.name}</label>
   <div className="fx-amount"><span>{meta.symbol}</span><input id="fx-amount" className="num" inputMode="decimal" autoComplete="off" value={amount} onChange={e=>setAmount(e.target.value)} aria-invalid={parsedAmount===null}/></div>
   <div className="fx-fee"><span>海外手續費</span><div><input className="num" inputMode="decimal" value={fee} onChange={e=>setFee(e.target.value)} aria-label="手續費百分比" aria-invalid={parsedFee===null}/>%</div></div>
  </section>
  {(parsedAmount===null||parsedFee===null)&&<p className="inline-error">{parsedAmount===null?'金額請填 0～100 億，最多兩位小數。':'手續費請填 0～20%。'}</p>}

  <div className="section-head"><h2>換算成台幣</h2><button onClick={()=>setAttempt(v=>v+1)} disabled={loading} style={{display:'inline-flex',alignItems:'center',gap:5}}><RefreshCw size={13} className={loading?'spin':undefined}/>{loading?'讀取中':'更新'}</button></div>
  {error&&<div className="banner"><Info size={16}/><span>{error}{snapshot?' 以下為上次成功讀取的資料。':''}</span></div>}
  {quotes.length>0&&(!sameDay||stale)&&<div className="banner info"><Info size={16}/><span>{!sameDay?'各卡組織報價日期不同，比較時請留意日期。':''}{stale?' 部分報價較舊，請先核對來源。':''}</span></div>}
  <div className="group" aria-busy={loading}>{rows.map(({network,quote,usable,current,estimate})=><div key={network} className={`fx-row${winner===network?' win':''}`}>
   <span className={`net net-${network}`} aria-hidden="true">{network==='visa'?'VISA':network==='mastercard'?<><i/><i/></>:'JCB'}</span>
   <div className="cell-main">
    <span className="cell-title" style={{display:'flex',alignItems:'center',gap:6}}>{FX_NAMES[network]}{winner===network&&<span className="tag open">最划算</span>}</span>
    <span className="cell-sub num">{usable?`${rateFormat.format(quote!.rate!)} · ${quote!.date!.slice(5).replace('-','/')}`:loading?'讀取中…':'暫無報價'}</span>
   </div>
   <div className="fx-total"><strong className="num">{estimate?<><small>NT$</small>{money.format(estimate.total)}</>:'—'}</strong><span className="num">{estimate?`含手續費 ${money.format(estimate.fee)}`:usable&&!current?'報價過期':''}</span></div>
  </div>)}</div>

  {picks.length>0&&<>
   <div className="section-head"><h2>在{place}刷哪張</h2><span>扣回饋後的實際成本</span></div>
   <div className="group">{picks.map(a=>{
    const cost=twd&&a.gain!==null?twd.total-a.gain:null;
    return <div key={a.card.id} className="cell">
     <CardArt card={a.card} compact/>
     <div className="cell-main"><span className="cell-title">{a.card.name}</span><span className="cell-sub clip">{(a.parts.find(p=>!p.full)||a.parts[0])?.c.name}</span></div>
     <div className="cell-end">{cost!==null?`NT$ ${plainMoney(Math.round(cost))}`:`${rateNumber(a.rate)}%`}<small>回饋 {rateNumber(a.rate)}%</small></div>
    </div>;
   })}</div>
  </>}

  <p className="caption">資料整理：優率網{snapshot?.fetchedAt&&` · 擷取於 ${new Date(snapshot.fetchedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})}`} · <a href={fxSourceUrl(currency)} target="_blank" rel="noopener noreferrer">來源頁</a></p>

  <button className="disclosure" aria-expanded={about} onClick={()=>setAbout(v=>!v)} style={{marginTop:8}}>關於報價與實際扣款<ChevronDown size={15}/></button>
  {about&&<div className="prose view">每 6 小時檢查來源更新。這是第三方整理的參考報價，非卡組織正式 API；取不到時不會以銀行牌告替代。{'\n\n'}實際匯率依清算日期而定，不一定是消費當天。手續費與四捨五入依發卡銀行規則。商家端自行換匯（DCC）不適用。{'\n\n'}{FX_NETWORKS.map(n=><a key={n} href={official[n]} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:3,marginRight:14}}>{FX_NAMES[n]} 官方<ArrowUpRight size={12}/></a>)}</div>}
 </div>;
}
