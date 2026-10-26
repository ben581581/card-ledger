'use client';

import {useEffect,useState} from 'react';
import {ArrowUpRight,ChevronDown,Info,RefreshCw} from 'lucide-react';
import {FX_CURRENCIES,FX_NAMES,FX_NETWORKS,canEstimateFx,estimateFx,fxDateAge,fxInput,fxSourceUrl,usableFxQuote,type FxCurrency,type FxSnapshot} from '../lib/fx';

const money=new Intl.NumberFormat('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2});
const rateFormat=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:8});
const official={visa:'https://www.visa.com.tw/support/consumer/travel-support/exchange-rate-calculator.html',mastercard:'https://www.mastercard.com/global/en/personal/get-support/convert-currency.html',jcb:'https://www.specialoffers.jcb/zh-tw/services/other/rate/'};

export default function ExchangeRates(){
  const [currency,setCurrency]=useState<FxCurrency>('JPY');
  const [amount,setAmount]=useState('10000'),[fee,setFee]=useState('1.5');
  const [snapshots,setSnapshots]=useState<Partial<Record<FxCurrency,FxSnapshot>>>({});
  const [loading,setLoading]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const [clock,setClock]=useState(()=>new Date());
  useEffect(()=>{
    const tick=()=>setClock(new Date());
    const timer=setInterval(tick,60000);
    window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick);
    return()=>{clearInterval(timer);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick);};
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),14000);
    setLoading(true);setError('');
    void fetch(`/api/exchange-rates?currency=${currency}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{
      if(!response.ok)throw new Error('匯率暫時無法讀取，請稍後再試。');
      const snapshot=await response.json() as FxSnapshot;
      if(snapshot.currency!==currency||snapshot.base!=='TWD'||!Array.isArray(snapshot.quotes))throw new Error('匯率資料格式有誤，請稍後再試。');
      if(!snapshot.quotes.some(usableFxQuote))throw new Error('來源目前未提供有效報價，可稍後重試或開啟來源頁。');
      if(!controller.signal.aborted)setSnapshots(previous=>({...previous,[currency]:snapshot}));
    }).catch(()=>{
      if(!controller.signal.aborted)setError('目前無法取得最新匯率，可稍後重試或開啟來源頁。');
    }).finally(()=>{
      clearTimeout(timer);
      if(!controller.signal.aborted)setLoading(false);
    });
    controller.signal.addEventListener('abort',()=>{clearTimeout(timer);if(!controller.signal.reason||controller.signal.reason.name!=='NavigationAbort'){setError('讀取逾時，請稍後重試。');setLoading(false);}});
    return()=>{clearTimeout(timer);controller.abort(new DOMException('Page changed','NavigationAbort'));};
  },[currency,attempt]);
  const meta=FX_CURRENCIES.find(item=>item.code===currency)!;
  const snapshot=snapshots[currency];
  const parsedAmount=fxInput(amount,10000000000),parsedFee=fxInput(fee,20);
  const quotes=snapshot?.quotes.filter(usableFxQuote)??[];
  const mixedDates=new Set(quotes.map(quote=>quote.date)).size>1;
  const old=quotes.some(quote=>fxDateAge(quote.date,clock)>3);
  const oldSnapshot=!!snapshot?.fetchedAt&&clock.getTime()-Date.parse(snapshot.fetchedAt)>86400000;
  const invalidAmount=parsedAmount===null,invalidFee=parsedFee===null;
  return <section className="fx-page" aria-label="信用卡組織刷卡匯率">
    <div className="fx-currencies" role="group" aria-label="選擇刷卡幣別">
      {FX_CURRENCIES.map(item=><button key={item.code} aria-pressed={currency===item.code} className={currency===item.code?'selected':''} onClick={()=>{setCurrency(item.code);setAmount(item.example);}}><span>{item.code}</span><small>{item.name}</small></button>)}
    </div>
    <section className="fx-calculator" aria-labelledby="fx-calculator-title">
      <div className="fx-section-top"><h2 id="fx-calculator-title">海外消費試算</h2><span>{currency} <span aria-hidden="true">→</span> TWD</span></div>
      <div className="fx-fields">
        <label className="fx-amount-label" htmlFor="fx-amount">刷卡金額 · {meta.name}<div className="fx-input-shell"><span aria-hidden="true">{meta.symbol}</span><input id="fx-amount" type="text" inputMode="decimal" autoComplete="off" value={amount} onChange={event=>setAmount(event.target.value)} aria-invalid={invalidAmount} aria-describedby={invalidAmount?'fx-amount-error':undefined}/></div></label>
        <label className="fx-fee-label" htmlFor="fx-fee">手續費<div className="fx-input-shell"><input id="fx-fee" type="text" inputMode="decimal" autoComplete="off" value={fee} onChange={event=>setFee(event.target.value)} aria-invalid={invalidFee} aria-describedby="fx-fee-hint"/><span aria-hidden="true">%</span></div></label>
      </div>
      {invalidAmount&&<p id="fx-amount-error" className="fx-field-error">請輸入 0～100 億的金額，最多兩位小數。</p>}
      {invalidFee&&<p className="fx-field-error">手續費請填 0～20%。</p>}
      <p id="fx-fee-hint" className="fx-hint">三組織使用相同手續費試算；1.5% 為範例值，請依發卡銀行調整。</p>
    </section>
    <div className="fx-comparison-heading"><div><h2>卡組織比較</h2><p>1 {currency} 可換算的臺幣金額</p></div><button className="fx-refresh" disabled={loading} onClick={()=>setAttempt(value=>value+1)}><RefreshCw size={14} className={loading?'spin':undefined}/>{loading?'讀取中':'重新讀取'}</button></div>
    {error&&<div className="fx-notice fx-warning" role="alert"><Info size={15}/><span>{error}{snapshot?' 以下保留上次成功讀取的資料。':''}</span></div>}
    {(mixedDates||old||oldSnapshot)&&<div className="fx-notice" role="status"><Info size={15}/><span>{mixedDates?'各組織報價日期不同，請對照日期參考。':''}{(old||oldSnapshot)?' 部分資料較舊，請先核對來源。':''}</span></div>}
    <div className="fx-quote-list" aria-busy={loading}>
      {FX_NETWORKS.map(network=>{
        const quote=snapshot?.quotes.find(item=>item.network===network);
        const usable=quote&&usableFxQuote(quote),outdated=!!usable&&fxDateAge(quote.date!,clock)>3;
        const current=!!quote&&!!snapshot&&canEstimateFx(quote,snapshot,clock);
        const estimate=current&&parsedAmount!==null&&parsedFee!==null?estimateFx(parsedAmount,quote!.rate!,parsedFee):null;
        return <article className="fx-quote" key={network} aria-label={`${FX_NAMES[network]} 匯率`}>
          <div className="fx-network"><span className={`fx-network-mark fx-${network}`} aria-hidden="true">{network==='visa'?'V':network==='mastercard'?<><i/><i/></>:'J'}</span><div><h3>{FX_NAMES[network]}</h3><span>{usable?<><time dateTime={quote.date!}>{quote.date}</time>{outdated&&' · 較舊報價'}</>:loading?'正在讀取報價':'暫無報價'}</span></div></div>
          <div className="fx-rate"><span>匯率</span><strong>{usable?rateFormat.format(quote.rate!):'—'}</strong><small>TWD / {currency}</small></div>
          <div className="fx-total"><span>預估含手續費</span><strong>{estimate?<><small>NT$</small> {money.format(estimate.total)}</>:'—'}</strong><small>{estimate?`換算 ${money.format(estimate.base)} ＋ 手續費 ${money.format(estimate.fee)}`:usable?current?'輸入有效金額即可試算':'報價已過期，暫停試算':'取得報價後即可試算'}</small></div>
        </article>;
      })}
    </div>
    <div className="fx-attribution"><span>資料整理：優率網{snapshot?.fetchedAt&&<small>擷取時間 {new Date(snapshot.fetchedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})} · 臺北</small>}</span><a href={fxSourceUrl(currency)} target="_blank" rel="noopener noreferrer">來源頁 <ArrowUpRight size={14}/></a></div>
    <details className="fx-explainer"><summary>關於報價與實際扣款<ChevronDown size={15}/></summary><div><p>每 6 小時檢查來源更新，重新讀取會優先使用雲端快取。這是第三方整理的參考報價，非卡組織正式 API；無法取得資料時不以銀行牌告或其他卡組織匯率替代。</p><p>實際使用匯率可能依授權、處理或清算日期而異，不一定是消費當天。手續費及金額四捨五入依發卡銀行規則，試算未計信用卡回饋，以帳單為準。商家自行換匯的 DCC 交易不適用本試算。</p><div className="fx-official-links">{FX_NETWORKS.map(network=><a key={network} href={official[network]} target="_blank" rel="noopener noreferrer">{FX_NAMES[network]} 官方查詢 <ArrowUpRight size={12}/></a>)}</div></div></details>
  </section>;
}
