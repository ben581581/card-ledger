'use client';
import {useState} from 'react';
import {Search,X,Plus,Pencil} from 'lucide-react';
import {Ledger,Campaign,Card,today} from '../lib/ledger';
import {channelMatches,searchChannels} from '../lib/channels';
import {CardArtwork} from './card-artwork';
const money=(n:number)=>new Intl.NumberFormat('zh-TW',{maximumFractionDigits:2}).format(n);

export function ChannelSearch({data,busy,onEdit,onAdd,onEntry}:{data:Ledger;busy:boolean;onEdit:(c:Campaign)=>void;onAdd:(cardId?:string)=>void;onEntry:(card:Card)=>void}){
 const [query,setQuery]=useState(''),[includeInactive,setIncludeInactive]=useState(false);
 const results=searchChannels(data,query,today(),includeInactive);
 const channels=[...new Set(data.campaigns.flatMap(c=>c.channels||[]))];
 return <section className="channel-search">
  <div className="search-box"><Search size={21}/><input aria-label="搜尋優惠通路" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋通路，例如：蝦皮、momo"/>{query&&<button aria-label="清除搜尋" onClick={()=>setQuery('')}><X size={18}/></button>}</div>
  {!!channels.length&&<div className="channel-suggestions">{channels.slice(0,12).map(channel=><button key={channel} className={query===channel?'selected':''} onClick={()=>setQuery(query===channel?'':channel)}>{channel}</button>)}</div>}
  <div className="search-options"><span role="status" aria-live="polite">{query?`「${query}」· `:''}{results.length} 張卡片</span><label><input type="checkbox" checked={includeInactive} onChange={e=>setIncludeInactive(e.target.checked)}/>包含非活動期間</label></div>
  <div className="search-results">{results.map(({card,matches})=><article className="search-card" key={card.id}>
   <div className="search-card-heading"><div className="search-card-image"><CardArtwork card={card}/></div><div><small>{card.bank||'信用卡'}</small><h2>{card.name}</h2><span>{matches.length} 個符合的優惠</span></div></div>
   {matches.map(({c,p})=><div className="search-offer" key={c.id}>
    <div className="offer-title"><h3>{c.name}</h3><button aria-label={`編輯 ${c.name}`} onClick={()=>onEdit(c)}><Pencil size={16}/></button></div>
    <div className="channel-tags">{(c.channels||[]).map(channel=><span className={channelMatches(channel,query)?'match':''} key={channel}>{channel}</span>)}</div>
    <div className="offer-metrics"><strong>{c.kind==='reward'?`${c.rate}% 回饋`:'消費滿額活動'}</strong><span>{!p.active?'非活動期間':p.remaining===0?c.kind==='reward'?'額度已用滿':'已達標':p.spendRemaining===null?'尚未設定回饋率':`${c.kind==='reward'?'還能刷':'達標還差'} NT$ ${money(p.spendRemaining)}`}</span></div>
    <small className="offer-period">{p.start} — {p.end}</small>{c.notes&&<p className="offer-notes">{c.notes}</p>}
   </div>)}
   <button className="outline search-entry" disabled={busy} onClick={()=>onEntry(card)}><Plus size={16}/>記錄這張卡的消費</button>
  </article>)}</div>
  {!results.length&&<div className="empty"><Search size={32}/><h2>{channels.length?'沒有符合的優惠':'先填入卡片的優惠通路'}</h2><p>{channels.length?'試試其他通路名稱，或勾選「包含非活動期間」。':'在「我的卡片」新增或編輯優惠活動，填入蝦皮、momo 等通路，就能在這裡搜尋。'}</p><button className="outline" disabled={busy||!data.cards.length} onClick={()=>onAdd()}><Plus size={16}/>新增優惠活動</button></div>}
  <p className="footnote">搜尋依你填入的優惠通路；回饋率分別顯示，不會自動相加。是否需登錄、指定付款方式等條件，請填在活動備註。</p>
 </section>;
}
