'use client';
import {useMemo,useState} from 'react';
import {Plus,Receipt,ChevronRight} from 'lucide-react';
import type {Card,Entry,Ledger} from '../../lib/ledger';
import {offerActive} from '../../lib/insights';
import {CardArtwork} from '../card-artwork';
import {money,shortDate} from '../format';

type Props={data:Ledger;today:string;tab:'cards'|'entries';onTab:(tab:'cards'|'entries')=>void;onCard:(card:Card)=>void;onAddCard:()=>void;onEntry:(entry?:Entry)=>void};
const pageSize=60;

export function WalletView({data,today,tab,onTab,onCard,onAddCard,onEntry}:Props){
 return <div className="fade-in">
  <div className="segmented" role="group" aria-label="錢包內容">
   <button aria-pressed={tab==='cards'} onClick={()=>onTab('cards')}>卡片 {data.cards.length}</button>
   <button aria-pressed={tab==='entries'} onClick={()=>onTab('entries')}>消費紀錄 {data.entries.length}</button>
  </div>
  {tab==='cards'?<Cards data={data} today={today} onCard={onCard} onAdd={onAddCard}/>:<Entries data={data} onEntry={onEntry}/>}
 </div>;
}

function Cards({data,today,onCard,onAdd}:{data:Ledger;today:string;onCard:(c:Card)=>void;onAdd:()=>void}){
 return <>
  <div className="wallet-stack" style={{marginTop:16}}>{data.cards.map(card=>{
   const offers=data.campaigns.filter(c=>c.cardId===card.id),live=offers.filter(c=>offerActive(c,card,today)).length;
   return <button key={card.id} className="wcard press" onClick={()=>onCard(card)}>
    <CardArtwork card={card}/>
    <div style={{flex:1,minWidth:0}}>
     <h3>{card.name}</h3>
     <p>{card.bank||'信用卡'}{!card.lookupOnly&&` · ${card.closeDay} 日結帳`}</p>
     <div className="tags"><span>{live}/{offers.length} 項優惠</span>{card.lookupOnly&&<span>僅查詢</span>}</div>
    </div>
    <ChevronRight size={18} className="chev"/>
   </button>;
  })}</div>
  <button className="btn btn-gray btn-block" style={{marginTop:14}} onClick={onAdd}><Plus size={18}/>新增卡片</button>
 </>;
}

function Entries({data,onEntry}:{data:Ledger;onEntry:(e?:Entry)=>void}){
 const [cardId,setCardId]=useState('all'),[limit,setLimit]=useState(pageSize);
 const cards=useMemo(()=>new Map(data.cards.map(c=>[c.id,c])),[data.cards]);
 const campaigns=useMemo(()=>new Map(data.campaigns.map(c=>[c.id,c])),[data.campaigns]);
 // Newest first; entries are appended, so the original index breaks same-day ties.
 const entries=useMemo(()=>data.entries.map((e,i)=>({e,i})).filter(({e})=>cardId==='all'||e.cardId===cardId).sort((a,b)=>b.e.date.localeCompare(a.e.date)||b.i-a.i).map(x=>x.e),[data.entries,cardId]);
 const months=useMemo(()=>{
  const map=new Map<string,{total:number;rows:Entry[]}>();
  for(const e of entries){const key=e.date.slice(0,7);const m=map.get(key)||{total:0,rows:[]};m.total+=Math.round(e.amount*100);m.rows.push(e);map.set(key,m);}
  return [...map.entries()];
 },[entries]);
 const tracked=data.cards.filter(c=>data.entries.some(e=>e.cardId===c.id));
 let shown=0;
 return <>
  {tracked.length>1&&<div className="chips" style={{marginTop:14}}><button className="chip" aria-pressed={cardId==='all'} onClick={()=>{setCardId('all');setLimit(pageSize);}}>全部</button>{tracked.map(c=><button key={c.id} className="chip" aria-pressed={cardId===c.id} onClick={()=>{setCardId(c.id);setLimit(pageSize);}}><CardArtwork card={c} compact/>{c.name}</button>)}</div>}
  {!entries.length&&<div className="empty" style={{marginTop:16}}><div className="empty-icon"><Receipt size={26}/></div><h3>還沒有消費紀錄</h3><p>記下一筆消費，額度與滿額進度會自動更新。</p><button className="btn btn-primary" disabled={!data.cards.length} onClick={()=>onEntry()}><Plus size={18}/>記一筆</button></div>}
  {months.map(([month,{total,rows}])=>{
   if(shown>=limit)return null;
   const visible=rows.slice(0,limit-shown);shown+=visible.length;
   const [y,m]=month.split('-');
   return <section key={month}>
    <div className="month-head"><b>{y} 年 {Number(m)} 月</b><span className="num">NT$ {money(total/100)}</span></div>
    <div className="group">{visible.map(e=>{const card=cards.get(e.cardId);const names=e.campaignIds.map(id=>campaigns.get(id)?.name).filter(Boolean);return <button key={e.id} className="cell" style={{'--inset':'72px'} as React.CSSProperties} onClick={()=>onEntry(e)}>
     {card?<CardArtwork card={card} compact/>:<Receipt size={20}/>}
     <div className="cell-main"><div className="cell-title">{e.note||'消費'}</div><div className="cell-sub">{shortDate(e.date)} · {card?.name}{names.length?` · ${names.join('、')}`:' · 未計入活動'}</div></div>
     <span className="entry-amt num">{money(e.amount)}</span>
    </button>;})}</div>
   </section>;
  })}
  {entries.length>limit&&<button className="btn btn-gray btn-block" style={{marginTop:14}} onClick={()=>setLimit(v=>v+pageSize)}>顯示更多（{entries.length-limit}）</button>}
 </>;
}
