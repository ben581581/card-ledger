'use client';
import {useDeferredValue,useMemo,useState} from 'react';
import {ChevronRight,Plus,Search,X} from 'lucide-react';
import type {Ledger} from '../../lib/ledger';
import {type Catalog,type CatalogCard,type WhatIf,catalogFilters,headlineRate,heldCard,whatIf} from '../../lib/catalog';
import {channelTerms,normalizeChannel} from '../../lib/channels';
import {offerActive} from '../../lib/insights';
import {CardArt,CatalogFace} from '../ui/card-art';
import {rate,whole} from '../format';

type Props={data:Ledger;today:string;catalog:Catalog|null;onCatalog:(id:string)=>void;onCard:(id:string)=>void;onAddCard:()=>void};

export function ExploreView({data,today,catalog,onCatalog,onCard,onAddCard}:Props){
 const [tab,setTab]=useState<'explore'|'mine'>('explore');
 return <div className="view">
  <div className="segmented" role="group" aria-label="卡庫內容">
   <button aria-pressed={tab==='explore'} onClick={()=>setTab('explore')}>探索新卡 {catalog?.cards.length??''}</button>
   <button aria-pressed={tab==='mine'} onClick={()=>setTab('mine')}>我的卡片 {data.cards.length}</button>
  </div>
  {tab==='explore'?<Explore data={data} today={today} catalog={catalog} onCatalog={onCatalog}/>:<Mine data={data} today={today} onCard={onCard} onAdd={onAddCard} onBrowse={()=>setTab('explore')}/>}
 </div>;
}

function Explore({data,today,catalog,onCatalog}:{data:Ledger;today:string;catalog:Catalog|null;onCatalog:(id:string)=>void}){
 const [filter,setFilter]=useState('all'),[query,setQuery]=useState('');
 const deferred=useDeferredValue(query.trim());
 const ranked=useMemo(()=>{
  if(!catalog)return [];
  return catalog.cards.map(entry=>({entry,held:!!heldCard(entry,data.cards),value:whatIf(entry,data,today)}))
   .sort((a,b)=>Number(a.held)-Number(b.held)||(b.value?.annual??-1)-(a.value?.annual??-1)||headlineRate(b.entry,today)-headlineRate(a.entry,today));
 },[catalog,data,today]);
 const list=useMemo(()=>{
  const terms=channelTerms(deferred),text=normalizeChannel(deferred);
  return ranked.filter(({entry})=>{
   if(filter!=='all'&&!entry.tags.includes(filter))return false;
   if(!text)return true;
   if(normalizeChannel(entry.name+entry.bank).includes(text))return true;
   return entry.perks.some(perk=>perk.channels.some(ch=>terms.some(term=>normalizeChannel(ch).includes(term))));
  });
 },[ranked,filter,deferred]);
 if(!catalog)return <div className="skeleton" style={{height:360,marginTop:14}}/>;
 return <>
  <div className="search" style={{marginTop:12}}><Search size={18}/>
   <input type="search" enterKeyHint="search" aria-label="搜尋卡片" placeholder="卡名、銀行或通路" value={query} onChange={e=>setQuery(e.target.value)}/>
   {query&&<button className="clear" aria-label="清除" onClick={()=>setQuery('')}><X size={12} strokeWidth={3}/></button>}
  </div>
  <div className="chips" role="group" aria-label="篩選">{catalogFilters.map(([key,label])=><button key={key} className="chip" aria-pressed={filter===key} onClick={()=>setFilter(key)}>{label}</button>)}</div>
  <div className="section-head"><h2>{data.entries.length?'依你的消費排序':'主流信用卡'}</h2><span className="num">{list.length} 張</span></div>
  {list.length?<div className="group">{list.map(({entry,held,value})=><Tile key={entry.id} entry={entry} held={held} value={value} today={today} onOpen={()=>onCatalog(entry.id)}/>)}</div>
   :<p className="caption">沒有符合的卡片，換個關鍵字試試。</p>}
  <p className="caption">資料核對於 {catalog.updatedAt.replaceAll('-','/')}。銀行權益常更動，申辦前請以官網為準。「可多」依你記錄的消費試算，未含年費與首刷禮。</p>
 </>;
}

function Tile({entry,held,value,today,onOpen}:{entry:CatalogCard;held:boolean;value:WhatIf|null;today:string;onOpen:()=>void}){
 const top=headlineRate(entry,today);
 const headline=entry.miles||[entry.domestic===entry.overseas?`一般 ${rate(entry.domestic)}%`:`國內 ${rate(entry.domestic)}%・海外 ${rate(entry.overseas)}%`,top>Math.max(entry.domestic,entry.overseas)?`最高 ${rate(top)}%`:'無上限'].join(' · ');
 return <button className="card-tile" onClick={onOpen}>
  <CatalogFace entry={entry}/>
  <div className="card-tile-main">
   <h3><span>{entry.bank} {entry.name}</span>{held&&<em className="tag" style={{fontStyle:'normal'}}>已持有</em>}</h3>
   <p>{headline}</p>
   {!held&&value&&value.uplift>0&&<div className="uplift">{value.reliable?`一年約多 NT$ ${whole(value.annual)}`:`近 ${value.days} 天可多 NT$ ${whole(value.uplift)}`}</div>}
  </div>
  <ChevronRight size={16} className="chev"/>
 </button>;
}

function Mine({data,today,onCard,onAdd,onBrowse}:{data:Ledger;today:string;onCard:(id:string)=>void;onAdd:()=>void;onBrowse:()=>void}){
 return <>
  <div className="group" style={{marginTop:14}}>{data.cards.map(card=>{
   const offers=data.campaigns.filter(c=>c.cardId===card.id),live=offers.filter(c=>offerActive(c,card,today)).length;
   return <button key={card.id} className="card-tile" onClick={()=>onCard(card.id)}>
    <CardArt card={card}/>
    <div className="card-tile-main"><h3><span>{card.name}</span></h3><p>{card.bank||'信用卡'}{card.lookupOnly?' · 只查詢優惠':` · ${card.closeDay} 日結帳`} · {live} 項當期優惠</p></div>
    <ChevronRight size={16} className="chev"/>
   </button>;
  })}</div>
  <div className="btn-row" style={{marginTop:12}}>
   <button className="btn btn-gray" onClick={onBrowse}>從卡庫加入</button>
   <button className="btn btn-gray" onClick={onAdd}><Plus size={17}/>手動新增</button>
  </div>
 </>;
}
