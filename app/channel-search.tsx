'use client';
import {useState} from 'react';
import {Search,X,Plus,Pencil,Receipt,ChevronDown,Infinity as InfinityIcon} from 'lucide-react';
import {Ledger,Campaign,Card,today} from '../lib/ledger';
import {channelMatches,searchChannels} from '../lib/channels';
import {displayPeriod} from '../lib/display-period';
import {CardArtwork} from './card-artwork';
const money=(n:number)=>new Intl.NumberFormat('zh-TW',{maximumFractionDigits:2}).format(n);

export function ChannelSearch({data,busy,onEdit,onAdd,onEntry}:{data:Ledger;busy:boolean;onEdit:(c:Campaign)=>void;onAdd:(cardId?:string)=>void;onEntry:(card:Card)=>void}){
 const [query,setQuery]=useState(''),[includeInactive,setIncludeInactive]=useState(false);
 const results=searchChannels(data,query,today(),includeInactive);
 const channels=[...new Set(data.campaigns.flatMap(c=>c.channels||[]))];
 return <section className="channel-search">
  <div className="search-box"><Search size={21}/><input aria-label="搜尋優惠通路" type="search" maxLength={80} value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋通路，例如：蝦皮、momo"/>{query&&<button aria-label="清除搜尋" onClick={()=>setQuery('')}><X size={18}/></button>}</div>
  {!!channels.length&&<div className="channel-suggestions">{channels.slice(0,12).map(channel=><button key={channel} className={query===channel?'selected':''} onClick={()=>setQuery(query===channel?'':channel)}>{channel}</button>)}</div>}
  <div className="search-options"><span role="status" aria-live="polite">{query?`「${query}」· `:''}{results.length} 張卡片</span><label><input type="checkbox" checked={includeInactive} onChange={e=>setIncludeInactive(e.target.checked)}/>包含非活動期間</label></div>
  <div className="search-results">{results.map(({card,matches})=><article className="search-card" key={card.id}>
   <div className="search-card-heading"><div className="search-card-image"><CardArtwork card={card}/></div><div><small>{card.bank||'信用卡'}</small><h2>{card.name}</h2><span>{matches.length} 個符合的優惠</span></div></div>
   {matches.map(({c,p})=><div className="search-offer" key={c.id}>
    <div className="offer-title"><h3>{c.name}</h3><button aria-label={`編輯 ${c.name}`} onClick={()=>onEdit(c)}><Pencil size={16}/></button></div>
    <div className="offer-metrics"><strong>{c.kind!=='spend'?(c.rateLabel?.trim()||`${c.rate}% 回饋`):'消費滿額活動'}</strong><span className={c.kind==='unlimited'?'unlimited-badge':undefined}>{c.kind==='unlimited'&&(card.lookupOnly?<Search size={15}/>:<InfinityIcon size={15}/>)} {!p.active?'非活動期間':c.kind==='unlimited'?(card.lookupOnly?'優惠查詢':'回饋無上限'):card.lookupOnly?`${c.kind==='reward'?'回饋上限':'消費門檻'} NT$ ${money(c.target)}`:p.remaining===0?c.kind==='reward'?'額度已用滿':'已達標':p.spendRemaining===null?'尚未設定回饋率':`${c.kind==='reward'?'還能刷':'達標還差'} NT$ ${money(p.spendRemaining)}`}</span></div>
    <OfferChannels channels={c.channels||[]} query={query}/>
    <small className="offer-period">{displayPeriod(c,p)}</small>{c.notes&&<details className="offer-conditions"><summary aria-label={`${c.name}：查看詳細條件`}>查看詳細條件<ChevronDown size={15} aria-hidden="true"/></summary><p className="offer-notes">{c.notes}</p></details>}
   </div>)}
   <div className="search-card-footer"><span>{card.lookupOnly?<><Search size={14}/>僅查詢優惠通路</>:matches.every(({c})=>c.kind==='unlimited')?<><InfinityIcon size={14}/>無上限優惠</>:'記帳後更新活動進度'}</span>{!card.lookupOnly&&<button className="search-entry" aria-label={`記錄 ${card.name} 的消費`} disabled={busy} onClick={()=>onEntry(card)}><Receipt size={16}/>記錄消費</button>}</div>
  </article>)}</div>
  {!results.length&&<div className="empty"><Search size={32}/><h2>{channels.length?'沒有符合的優惠':'先填入卡片的優惠通路'}</h2><p>{channels.length?'試試其他通路名稱，或勾選「包含非活動期間」。':'在「我的卡片」新增或編輯優惠活動，填入蝦皮、momo 等通路，就能在這裡搜尋。'}</p><button className="outline" disabled={busy||!data.cards.length} onClick={()=>onAdd()}><Plus size={16}/>新增優惠活動</button></div>}
  <p className="footnote">搜尋依你填入的優惠通路；回饋率分別顯示，不會自動相加。是否需登錄、指定付款方式等條件，請填在活動備註。</p>
 </section>;
}

function OfferChannels({channels,query}:{channels:string[];query:string}){
 const matched=query.trim()?channels.filter(c=>channelMatches(c,query)):[];
 const ordered=[...matched,...channels.filter(c=>!matched.includes(c))];
 return <><div className="channel-tags">{ordered.slice(0,4).map(channel=><span className={query.trim()&&channelMatches(channel,query)?'match':''} key={channel}>{channel}</span>)}</div>{channels.length>4&&<details className="more-channels"><summary>全部 {channels.length} 個通路</summary><div className="channel-tags">{ordered.slice(4).map(channel=><span className={query.trim()&&channelMatches(channel,query)?'match':''} key={channel}>{channel}</span>)}</div></details>}</>;
}
