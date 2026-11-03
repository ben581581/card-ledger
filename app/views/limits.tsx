'use client';
import {useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight,ChevronDown,Gauge,Plus,CreditCard,Receipt} from 'lucide-react';
import type {Card,Entry,Ledger} from '../../lib/ledger';
import {type Row,type Status,trackedRows} from '../../lib/insights';
import {indexEntriesByCampaign} from '../../lib/entry-index';
import {CardArtwork} from '../card-artwork';
import {daysText,money,monthTitle,periodNames,rangeText,shortDate,statusLabel,whole} from '../format';

type Props={
 data:Ledger;on:string;today:string;loading:boolean;
 onShift:(months:number)=>void;onToday:()=>void;
 onOpen:(row:Row)=>void;onCard:(card:Card)=>void;onEntry:(entry?:Entry)=>void;onAddCampaign:()=>void;onAddCard:()=>void;onAllEntries:()=>void;
};
type Group={card:Card;rows:Row[]};
const rank:Record<Status,number>={near:0,open:1,unset:2,full:3,upcoming:4,ended:5};

// One section per card; the card with the most urgent activity comes first.
function groupByCard(rows:Row[],cards:Card[]):Group[]{
 const groups=new Map<string,Group>();
 for(const row of rows){const g=groups.get(row.card.id)||{card:row.card,rows:[]};g.rows.push(row);groups.set(row.card.id,g);}
 const order=new Map(cards.map((c,i)=>[c.id,i]));
 return [...groups.values()].sort((a,b)=>rank[a.rows[0].status]-rank[b.rows[0].status]||(order.get(a.card.id)??0)-(order.get(b.card.id)??0));
}

export function LimitsView({data,on,today,loading,onShift,onToday,onOpen,onCard,onEntry,onAddCampaign,onAddCard,onAllEntries}:Props){
 const [cardId,setCardId]=useState('all'),[showPast,setShowPast]=useState(false);
 const index=useMemo(()=>indexEntriesByCampaign(data.entries),[data.entries]);
 const all=useMemo(()=>trackedRows(data,on,index),[data,on,index]);
 const trackedCards=useMemo(()=>data.cards.filter(card=>all.some(r=>r.card.id===card.id)),[data.cards,all]);
 const scope=cardId==='all'||!trackedCards.some(c=>c.id===cardId)?'all':cardId;
 const rows=scope==='all'?all:all.filter(r=>r.card.id===scope);
 const live=rows.filter(r=>r.p.active),past=rows.filter(r=>!r.p.active);
 const groups=groupByCard(live,data.cards);
 const near=live.filter(r=>r.status==='near').length,full=live.filter(r=>r.status==='full').length;
 const cards=new Map(data.cards.map(c=>[c.id,c]));
 const recent=useMemo(()=>data.entries.filter(e=>scope==='all'||e.cardId===scope).map((e,i)=>({e,i})).sort((a,b)=>b.e.date.localeCompare(a.e.date)||b.i-a.i).slice(0,5).map(x=>x.e),[data.entries,scope]);

 if(loading&&!data.cards.length)return <div style={{display:'grid',gap:12}}><div className="skeleton" style={{height:160}}/><div className="skeleton" style={{height:300}}/></div>;
 if(!data.cards.length)return <div className="empty fade-in"><div className="empty-icon"><CreditCard size={28}/></div><h3>從第一張卡開始</h3><p>新增信用卡，再設定回饋上限或滿額門檻，就能隨時看到每個活動還能刷多少。</p><button className="btn btn-primary" onClick={onAddCard}><Plus size={18}/>新增卡片</button></div>;

 return <div className="fade-in">
  <div className="period-bar">
   <button className="nav-btn" aria-label="上個月" onClick={()=>onShift(-1)}><ChevronLeft size={18}/></button>
   <button className="nav-btn" aria-label="下個月" onClick={()=>onShift(1)}><ChevronRight size={18}/></button>
   <span className="label"><b>{monthTitle(on)}</b>{on!==today&&` · 以 ${shortDate(on)} 計算`}</span>
   {on.slice(0,7)!==today.slice(0,7)&&<button className="today" onClick={onToday}>回到本月</button>}
  </div>

  {live.length>0&&<p className="pulse-line" role="status">
   <span className="num">{live.length}</span> 個活動進行中{near>0&&<> · <span className="num amber">{near}</span> 個快滿了</>}{full>0&&<> · <span className="num green">{full}</span> 個已滿</>}
  </p>}

  {trackedCards.length>1&&<div className="chips" style={{marginTop:4}} role="group" aria-label="篩選卡片">
   <button className="chip" aria-pressed={scope==='all'} onClick={()=>setCardId('all')}>全部</button>
   {trackedCards.map(card=><button key={card.id} className="chip" aria-pressed={scope===card.id} onClick={()=>setCardId(card.id)}><CardArtwork card={card} compact/>{card.name}</button>)}
  </div>}

  {!rows.length&&<div className="empty" style={{marginTop:20}}><div className="empty-icon"><Gauge size={28}/></div><h3>還沒有要追蹤的活動</h3><p>建立「回饋上限」或「消費滿額」活動，每個活動的額度會依消費自動計算。</p><button className="btn btn-primary" onClick={onAddCampaign}><Plus size={18}/>新增活動</button></div>}
  {rows.length>0&&!live.length&&<p className="caption" style={{marginTop:18}}>這個月沒有進行中的活動。</p>}

  {groups.map(g=><CardGroup key={g.card.id} group={g} onOpen={onOpen} onCard={()=>onCard(g.card)}/>)}

  {past.length>0&&<>
   <button className="disclosure" style={{marginTop:14}} aria-expanded={showPast} onClick={()=>setShowPast(v=>!v)}>{showPast?'收起':'顯示'}非當期活動 {past.length}<ChevronDown size={15} style={{transform:showPast?'rotate(180deg)':undefined,transition:'transform .3s'}}/></button>
   {showPast&&groupByCard(past,data.cards).map(g=><CardGroup key={g.card.id} group={g} onOpen={onOpen} onCard={()=>onCard(g.card)}/>)}
  </>}

  <div className="section-head"><h2>最近消費</h2>{data.entries.length>0&&<button onClick={onAllEntries}>全部</button>}</div>
  {recent.length?<div className="group">{recent.map(e=>{const card=cards.get(e.cardId);return <button key={e.id} className="cell" style={{'--inset':'72px'} as React.CSSProperties} onClick={()=>onEntry(e)}>
   {card?<CardArtwork card={card} compact/>:<Receipt size={20}/>}
   <div className="cell-main"><div className="cell-title">{e.note||'消費'}</div><div className="cell-sub">{shortDate(e.date)} · {card?.name}</div></div>
   <span className="entry-amt num">NT$ {money(e.amount)}</span>
  </button>;})}</div>:<p className="caption">按右下角 ＋ 記一筆，勾選的活動會同步更新額度。</p>}
  <p className="caption">可刷金額 = 剩餘回饋 ÷ 回饋率，向下取整。帳單週期含結帳日，隔天開始新週期。</p>
 </div>;
}

function CardGroup({group:{card,rows},onOpen,onCard}:{group:Group;onOpen:(r:Row)=>void;onCard:()=>void}){
 const bill=rows.find(r=>r.c.period==='bill');
 return <section className="cgroup">
  <button className="cgroup-head" onClick={onCard} aria-label={`${card.name} 卡片詳情`}>
   <CardArtwork card={card} compact/>
   <div className="cell-main"><h2>{card.name}</h2><p>{card.bank||'信用卡'} · {rows.length} 個活動{bill?` · 帳單 ${rangeText(bill.p.start,bill.p.end)}`:''}</p></div>
   <ChevronRight size={17} className="chev"/>
  </button>
  <div className="group">{rows.map(r=><CapRow key={r.c.id} row={r} onOpen={()=>onOpen(r)}/>)}</div>
 </section>;
}

// Each activity shows its own cap: how much is used, and how much spending is left.
export function CapRow({row:r,onOpen}:{row:Row;onOpen:()=>void}){
 const reward=r.c.kind==='reward',done=r.status==='full';
 const used=reward?`回饋 ${money(r.p.value)} / ${money(r.c.target)}`:`已刷 ${whole(r.p.spend)} / ${whole(r.c.target)}`;
 const tag=r.status==='near'?<span className="tag tag-near">{statusLabel(r)}</span>:done?<span className="tag tag-full">{statusLabel(r)}</span>:!r.p.active?<span className="tag tag-muted">{statusLabel(r)}</span>:null;
 return <button className={`cap s-${r.status}`} onClick={onOpen} aria-label={`${r.card.name} ${r.c.name}，${statusLabel(r)}，${used}`}>
  <div className="cap-top"><span className="cap-name">{r.c.name}</span>{tag}</div>
  <div className="cap-mid">
   <div className="cap-left">{done?<strong className="num">{reward?'額度用完':'已達標'}</strong>:r.p.spendRemaining===null?<strong>請設定回饋率</strong>:<><span>{reward?'還能刷':'還差'}</span><strong className="num"><small>NT$</small>{whole(r.p.spendRemaining)}</strong></>}</div>
   <span className="cap-used num">{used}</span>
  </div>
  <div className="track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.p.percent)}><i style={{width:`${r.p.percent}%`}}/></div>
  <div className="cap-meta">{reward&&<span>{r.c.rate}%</span>}<span>{periodNames[r.c.period]}</span>{r.p.active?!done&&<span style={{color:r.days<=5?'var(--amber)':undefined}}>{daysText(r.days)}</span>:<span>{rangeText(r.p.start,r.p.end)}</span>}</div>
 </button>;
}
