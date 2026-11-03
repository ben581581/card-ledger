'use client';
import {useDeferredValue,useMemo,useState} from 'react';
import {Search,X,Sparkles,ChevronDown,ChevronRight,Tag} from 'lucide-react';
import {type Card,type Ledger,progress,tracksProgress} from '../../lib/ledger';
import {featuredChannels,normalizeChannel} from '../../lib/channels';
import {type Offer,offerActive,rankOffers,rateText} from '../../lib/insights';
import {indexEntriesByCampaign} from '../../lib/entry-index';
import {CardArtwork} from '../card-artwork';
import {whole} from '../format';

type Props={data:Ledger;today:string;onOpen:(offer:Offer,query?:string)=>void;onAddCampaign:()=>void};

export function capacityText(o:Offer){
 if(!o.p.active)return '非活動期間';
 if(!o.tracked)return o.c.kind==='unlimited'&&!o.c.queryOnly&&!o.card.lookupOnly?'回饋無上限':'僅查詢 · 依官方條件';
 if(o.c.kind==='spend')return o.p.remaining===0?'已達標':`滿額還差 NT$ ${whole(o.p.spendRemaining??0)}`;
 if(o.p.remaining===0)return '本期已用滿';
 return o.p.spendRemaining===null?'未設定回饋率':`還能刷 NT$ ${whole(o.p.spendRemaining)}`;
}

export function OffersView({data,today,onOpen,onAddCampaign}:Props){
 const [query,setQuery]=useState(''),[inactive,setInactive]=useState(false);
 const deferred=useDeferredValue(query.trim());
 const index=useMemo(()=>indexEntriesByCampaign(data.entries),[data.entries]);
 const featured=useMemo(()=>featuredChannels(data,today),[data,today]);
 const results=useMemo(()=>deferred?rankOffers(data,deferred,today,inactive,index):[],[data,deferred,today,inactive,index]);
 const hasChannels=data.campaigns.some(c=>c.channels?.length);
 const [best,...rest]=results;

 return <div className="fade-in">
  <div className="search">
   <div className="search-field"><Search size={18}/>
    <input type="search" enterKeyHint="search" aria-label="搜尋通路" placeholder="通路名稱，例如：蝦皮、全聯" value={query} maxLength={80} onChange={e=>setQuery(e.target.value)}/>
    {query&&<button aria-label="清除" onClick={()=>setQuery('')}><X size={13} strokeWidth={3}/></button>}
   </div>
  </div>
  {!!featured.length&&<div className="chips" role="group" aria-label="熱門通路">{featured.map(({channel,cardCount})=>{const on=normalizeChannel(query)===normalizeChannel(channel);return <button key={channel} className="chip" aria-pressed={on} onClick={()=>setQuery(on?'':channel)}>{channel}<em>{cardCount} 張</em></button>;})}</div>}

  {deferred?<>
   <div className="section-head" style={{marginTop:18}}><h2>{results.length?'該刷哪張':'沒有符合的優惠'}</h2><button onClick={()=>setInactive(v=>!v)} style={{color:inactive?'var(--accent)':undefined}}>{inactive?'✓ ':''}含非期間</button></div>
   {best&&<button className="best press" onClick={()=>onOpen(best,deferred)}>
    <span className="best-label"><Sparkles size={13}/>{best.usable?'最佳選擇':'目前皆無可用額度'}</span>
    <div className="best-main"><CardArtwork card={best.card}/><div style={{minWidth:0}}><h3>{best.card.name}</h3><p>{best.c.name}</p></div></div>
    <div className="best-rate num">{rateText(best.c)}</div>
    <div className="best-foot"><span>{capacityText(best)}</span>{best.c.registration?.type==='required'&&<span className="mini-reg">{best.c.registration.label}</span>}</div>
   </button>}
   {rest.length>0&&<div className="group" style={{marginTop:12}}>{rest.map(o=><OfferCell key={o.c.id} offer={o} onOpen={()=>onOpen(o,deferred)}/>)}</div>}
   {!results.length&&<p className="caption">{hasChannels?'換個通路名稱試試，或開啟「含非期間」。':'先在卡片的優惠活動中填入適用通路，例如蝦皮、momo。'}</p>}
   {results.length>1&&<p className="caption">依「當期有效 → 仍有額度 → 回饋率」排序。各活動回饋率分別顯示，不會自動相加。</p>}
  </>:<Browse data={data} today={today} onOpen={onOpen} onAdd={onAddCampaign} index={index}/>}
 </div>;
}

function OfferCell({offer:o,onOpen}:{offer:Offer;onOpen:()=>void}){
 return <button className="cell" style={{'--inset':'72px',opacity:o.usable?1:.55} as React.CSSProperties} onClick={onOpen}>
  <CardArtwork card={o.card} compact/>
  <div className="cell-main"><div className="cell-title">{o.card.name}</div><div className="cell-sub">{o.c.name} · {capacityText(o)}</div></div>
  <span className={`rate-pill num${o.usable?'':' dim'}`}>{rateText(o.c)}</span>
 </button>;
}

function Browse({data,today,onOpen,onAdd,index}:{data:Ledger;today:string;onOpen:(o:Offer)=>void;onAdd:()=>void;index:ReturnType<typeof indexEntriesByCampaign>}){
 const [open,setOpen]=useState<string|null>(null);
 const grouped=useMemo(()=>data.cards.map(card=>({card,offers:data.campaigns.filter(c=>c.cardId===card.id)})).filter(g=>g.offers.length),[data]);
 if(!grouped.length)return <div className="empty" style={{marginTop:20}}><div className="empty-icon"><Tag size={26}/></div><h3>還沒有優惠資料</h3><p>為卡片新增優惠活動並填入通路，就能用通路名稱一次比較所有卡。</p><button className="btn btn-primary" onClick={onAdd}>新增優惠</button></div>;
 return <>
  <div className="section-head" style={{marginTop:22}}><h2>我的卡片優惠</h2><span>{data.campaigns.length} 項</span></div>
  <div className="group">{grouped.map(({card,offers})=>{
   const expanded=open===card.id;
   const live=offers.filter(c=>offerActive(c,card,today));
   const top=Math.max(0,...live.filter(c=>c.kind!=='spend').map(c=>c.rate));
   return <div key={card.id}>
    <button className="cell" style={{'--inset':'72px'} as React.CSSProperties} aria-expanded={expanded} onClick={()=>setOpen(expanded?null:card.id)}>
     <CardArtwork card={card} compact/>
     <div className="cell-main"><div className="cell-title">{card.name}</div><div className="cell-sub">{live.length} 項當期優惠{top>0&&` · 最高 ${top}%`}</div></div>
     <ChevronDown size={17} className="chev" style={{transform:expanded?'rotate(180deg)':undefined,transition:'transform .3s'}}/>
    </button>
    {expanded&&<div style={{background:'var(--bg-1)'}}>{offers.map(c=><OfferLine key={c.id} card={card} c={c} today={today} onOpen={()=>onOpen(toOffer(card,c,today,index))}/>)}</div>}
   </div>;
  })}</div>
  <p className="caption">輸入通路名稱，會依額度與回饋率幫你挑出最適合的卡。</p>
 </>;
}

function OfferLine({card,c,today,onOpen}:{card:Card;c:Ledger['campaigns'][number];today:string;onOpen:()=>void}){
 const active=offerActive(c,card,today);
 return <button className="cell" style={{paddingLeft:28,opacity:active?1:.5}} onClick={onOpen}>
  <div className="cell-main"><div className="cell-title" style={{fontSize:15}}>{c.name}</div><div className="cell-sub">{c.channels?.slice(0,4).join('、')||'未填通路'}{(c.channels?.length||0)>4&&` 等 ${c.channels!.length} 個`}</div></div>
  <span className={`rate-pill num${active?'':' dim'}`}>{rateText(c)}</span>
  <ChevronRight size={16} className="chev"/>
 </button>;
}

// Browsing reuses the same detail sheet as search results.
function toOffer(card:Card,c:Ledger['campaigns'][number],on:string,index:ReturnType<typeof indexEntriesByCampaign>):Offer{
 const p=progress(c,card,index.get(c.id)||[],on);
 const tracked=!card.lookupOnly&&tracksProgress(c);
 return {c,card,p,tracked,usable:p.active&&(!tracked||c.kind==='spend'||p.remaining>0)};
}
