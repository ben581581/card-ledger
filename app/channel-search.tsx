'use client';
import {useRef,useState} from 'react';
import {Search,X,Plus,Pencil,Receipt,ChevronDown,Infinity as InfinityIcon} from 'lucide-react';
import {Ledger,Campaign,Card,today} from '../lib/ledger';
import {channelMatches,normalizeChannel,searchChannels} from '../lib/channels';
import {displayPeriod} from '../lib/display-period';
import {CardArtwork} from './card-artwork';
const money=(n:number)=>new Intl.NumberFormat('zh-TW',{maximumFractionDigits:2}).format(n);

export function ChannelSearch({data,busy,onEdit,onAdd,onEntry}:{data:Ledger;busy:boolean;onEdit:(c:Campaign)=>void;onAdd:(cardId?:string)=>void;onEntry:(card:Card)=>void}){
 const [query,setQuery]=useState(''),[includeInactive,setIncludeInactive]=useState(false),[showAllChannels,setShowAllChannels]=useState(false);
 const searchInput=useRef<HTMLInputElement>(null);
 const term=query.trim(),on=today(),hasQuery=!!term;
 const results=searchChannels(data,term,on,includeInactive);
 const channels=[...new Set(data.campaigns.flatMap(c=>c.channels||[]))];
 const offerCount=results.reduce((count,result)=>count+result.matches.length,0);
 function clearSearch(){setQuery('');searchInput.current?.focus();}
 return <section className="channel-search">
  <div className="search-panel">
   <div className="search-box"><Search size={21}/><input ref={searchInput} aria-label="搜尋優惠通路" type="search" maxLength={80} value={query} onChange={e=>setQuery(e.target.value)} placeholder="想在哪裡刷卡？蝦皮、momo…"/>{query&&<button type="button" aria-label="清除搜尋" onClick={clearSearch}><X size={18}/></button>}</div>
   {!!channels.length&&<><span className="search-quick-label">你的優惠通路</span><div className="channel-suggestions" id="quick-search-channels">{(showAllChannels?channels:channels.slice(0,6)).map(channel=>{
    const selected=normalizeChannel(term)===normalizeChannel(channel);
    return <button type="button" key={channel} className={selected?'selected':''} aria-pressed={selected} onClick={()=>setQuery(selected?'':channel)}>{channel}</button>;
   })}{channels.length>6&&<button type="button" className="channel-suggestions-toggle" aria-expanded={showAllChannels} aria-controls="quick-search-channels" onClick={()=>setShowAllChannels(v=>!v)}>{showAllChannels?'收起通路':`更多通路 +${channels.length-6}`}<ChevronDown size={14}/></button>}</div></>}
   <div className="search-options"><span className="search-period-hint">今日 {on.replaceAll('-','/')}</span><label><input type="checkbox" checked={includeInactive} onChange={e=>setIncludeInactive(e.target.checked)}/>包含非活動期間</label></div>
  </div>
  <div className="search-result-summary" role="status" aria-live="polite"><strong>{hasQuery?`「${term}」的優惠`:'瀏覽所有優惠'}</strong><span>{results.length} 張卡片 · {offerCount} 項{includeInactive?'優惠':'適用優惠'}</span></div>
  <div className="search-results">{results.map(({card,matches})=><article className="search-card" key={card.id}>
   <div className="search-card-heading"><div className="search-card-image"><CardArtwork card={card}/></div><div><small>{card.bank||'信用卡'}</small><h2>{card.name}</h2><div className="search-card-tags"><span>{matches.length} 項{hasQuery?'符合':'通路'}優惠</span>{(card.lookupOnly||matches.every(({c})=>c.kind==='unlimited'))&&<span className="search-card-purpose">{card.lookupOnly?<><Search size={12}/>通路查詢</>:<><InfinityIcon size={12}/>無上限回饋</>}</span>}</div></div></div>
   {matches.map(({c,p})=><div className="search-offer" key={c.id}>
    <div className="offer-title"><h3>{c.name}</h3><button aria-label={`編輯 ${c.name}`} onClick={()=>onEdit(c)}><Pencil size={16}/></button></div>
    <div className="offer-metrics"><strong>{c.kind==='spend'?'消費滿額活動':c.rate>0?`${c.rate}% 回饋`:'回饋優惠'}</strong><span className={`offer-state${!p.active?' inactive':c.kind==='unlimited'?' unlimited-badge':!card.lookupOnly&&p.remaining===0?' complete':''}`}>{p.active&&c.kind==='unlimited'&&<InfinityIcon size={15}/>} {!p.active?'非活動期間':c.kind==='unlimited'?'回饋無上限':card.lookupOnly?`${c.kind==='reward'?'回饋上限':'消費門檻'} NT$ ${money(c.target)}`:p.remaining===0?c.kind==='reward'?'額度已用滿':'已達標':p.spendRemaining===null?'尚未設定回饋率':`${c.kind==='reward'?'還能刷':'達標還差'} NT$ ${money(p.spendRemaining)}`}</span></div>
    <OfferChannels channels={c.channels||[]} query={term}/>
    <small className="offer-period">{displayPeriod(c,p)}</small>{c.notes&&<details className="offer-conditions"><summary>優惠條件</summary><p className="offer-notes">{c.notes}</p></details>}
   </div>)}
   <div className="search-card-footer"><span>{card.lookupOnly?<><Search size={14}/>僅查詢優惠通路</>:matches.every(({c})=>c.kind==='unlimited')?<><InfinityIcon size={14}/>無上限優惠</>:'記帳後更新活動進度'}</span>{!card.lookupOnly&&<button className="search-entry" aria-label={`記錄 ${card.name} 的消費`} disabled={busy} onClick={()=>onEntry(card)}><Receipt size={16}/>記錄消費</button>}</div>
  </article>)}</div>
  {!results.length&&<div className="empty"><Search size={32}/><h2>{!channels.length?'建立你的通路優惠':hasQuery?'找不到符合的優惠':'目前沒有適用優惠'}</h2><p>{!channels.length?'在卡片新增優惠活動，填入蝦皮、momo 等通路，就能在這裡查詢。':hasQuery?'換個通路名稱，或勾選「包含非活動期間」看看其他優惠。':'可勾選「包含非活動期間」，查看尚未開始或已結束的優惠。'}</p><div className="search-empty-actions">{hasQuery&&channels.length>0&&<button type="button" className="outline" onClick={clearSearch}><X size={16}/>清除搜尋</button>}<button type="button" className="outline" disabled={busy||!data.cards.length} onClick={()=>onAdd()}><Plus size={16}/>新增優惠活動</button></div></div>}
  <p className="footnote">依你設定的通路與有效日期查詢。各優惠回饋不會自動相加；登錄與付款條件可註記在活動備註。</p>
 </section>;
}

function OfferChannels({channels,query}:{channels:string[];query:string}){
 const matched=query.trim()?channels.filter(c=>channelMatches(c,query)):[];
 const ordered=[...matched,...channels.filter(c=>!matched.includes(c))];
 return <><div className="channel-tags">{ordered.slice(0,4).map(channel=><span className={query.trim()&&channelMatches(channel,query)?'match':''} key={channel}>{channel}</span>)}</div>{channels.length>4&&<details className="more-channels"><summary>全部 {channels.length} 個通路</summary><div className="channel-tags">{ordered.slice(4).map(channel=><span className={query.trim()&&channelMatches(channel,query)?'match':''} key={channel}>{channel}</span>)}</div></details>}</>;
}
