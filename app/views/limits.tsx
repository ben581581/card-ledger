'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,Gauge,Plus,CreditCard} from 'lucide-react';
import type {Card,Entry,Ledger} from '../../lib/ledger';
import {type Row,trackedRows} from '../../lib/insights';
import {indexEntriesByCampaign} from '../../lib/entry-index';
import {CardArtwork} from '../card-artwork';
import {daysText,money,periodNames,rangeText,shortDate,statusLabel,whole} from '../format';

type Props={
 data:Ledger;on:string;today:string;loading:boolean;
 onOpen:(row:Row)=>void;onCard:(card:Card)=>void;onEntry:(entry?:Entry)=>void;onRecord:(cardId:string)=>void;
 onAddCampaign:(cardId?:string)=>void;onAddCard:()=>void;onAllEntries:()=>void;
};
const storeKey='cardi-selected-card';

export function LimitsView({data,on,loading,onOpen,onCard,onEntry,onRecord,onAddCampaign,onAddCard,onAllEntries}:Props){
 const index=useMemo(()=>indexEntriesByCampaign(data.entries),[data.entries]);
 const all=useMemo(()=>trackedRows(data,on,index),[data,on,index]);
 const cards=useMemo(()=>data.cards.filter(c=>!c.lookupOnly),[data.cards]);
 const [picked,setPicked]=useState<string|null>(null),[showPast,setShowPast]=useState(false);
 const rail=useRef<HTMLDivElement>(null);
 const selected=cards.find(c=>c.id===picked)||cards[0];
 const at=selected?cards.indexOf(selected):0;

 // Remember the last card across visits; jump the rail to it once cards arrive.
 useEffect(()=>{try{const v=localStorage.getItem(storeKey);if(v)setPicked(v);}catch{}},[]);
 useEffect(()=>{if(selected)try{localStorage.setItem(storeKey,selected.id);}catch{}},[selected]);
 const placed=useRef(false);
 useEffect(()=>{const el=rail.current;if(!el||placed.current||!cards.length)return;placed.current=true;const slide=el.children[at] as HTMLElement|undefined;if(slide)el.scrollLeft=slide.offsetLeft-(el.clientWidth-slide.clientWidth)/2;},[cards.length,at]);

 function onScroll(){
  const el=rail.current;if(!el)return;
  const center=el.scrollLeft+el.clientWidth/2;let best=0,dist=Infinity;
  [...el.children].forEach((child,i)=>{const c=child as HTMLElement;const d=Math.abs(c.offsetLeft+c.clientWidth/2-center);if(d<dist){dist=d;best=i;}});
  if(cards[best]&&cards[best].id!==selected?.id)setPicked(cards[best].id);
 }
 function jump(id:string){
  setPicked(id);const i=cards.findIndex(c=>c.id===id);const el=rail.current,slide=el?.children[i] as HTMLElement|undefined;
  if(el&&slide)el.scrollTo({left:slide.offsetLeft-(el.clientWidth-slide.clientWidth)/2,behavior:'smooth'});
 }

 if(loading&&!data.cards.length)return <div style={{display:'grid',gap:14}}><div className="skeleton" style={{height:200}}/><div className="skeleton" style={{height:260}}/></div>;
 if(!cards.length)return <div className="empty fade-in"><div className="empty-icon"><CreditCard size={28}/></div><h3>從第一張卡開始</h3><p>新增信用卡，再設定回饋上限或滿額門檻，就能隨時看到每個活動還能刷多少。</p><button className="btn btn-primary" onClick={onAddCard}><Plus size={18}/>新增卡片</button></div>;

 const rows=all.filter(r=>r.card.id===selected.id),live=rows.filter(r=>r.p.active),past=rows.filter(r=>!r.p.active);
 const near=all.filter(r=>r.status==='near'||r.status==='unset');
 const flag=(id:string)=>all.some(r=>r.card.id===id&&r.status==='near');
 const bill=live.find(r=>r.c.period==='bill');
 const recent=data.entries.map((e,i)=>({e,i})).filter(({e})=>e.cardId===selected.id).sort((a,b)=>b.e.date.localeCompare(a.e.date)||b.i-a.i).slice(0,4).map(x=>x.e);

 return <div className="fade-in">
  {near.length>0&&<div className="alerts" role="list" aria-label="快滿了">{near.map(r=><button role="listitem" key={r.c.id} className="alert press" onClick={()=>{jump(r.card.id);onOpen(r);}}>
   <CardArtwork card={r.card} compact/><span><b>{r.c.name}</b>{r.p.spendRemaining===null?'請設定回饋率':`還能刷 ${whole(r.p.spendRemaining)}`}</span>
  </button>)}</div>}

  <div className="rail" ref={rail} onScroll={onScroll} aria-label="選擇卡片">
   {cards.map(c=><button key={c.id} className={`slide${c.id===selected.id?' on':''}`} aria-pressed={c.id===selected.id} aria-label={c.name} onClick={()=>c.id===selected.id?onCard(c):jump(c.id)}>
    <CardArtwork card={c}/>{flag(c.id)&&<i className="slide-flag" aria-label="有活動快滿了"/>}
   </button>)}
  </div>
  {cards.length>1&&<div className="dots" aria-hidden="true">{cards.map(c=><i key={c.id} className={c.id===selected.id?'on':undefined}/>)}</div>}

  <div className="card-line">
   <button onClick={()=>onCard(selected)}><h2>{selected.name}</h2><p>{selected.bank||'信用卡'} · {bill?`帳單 ${rangeText(bill.p.start,bill.p.end)}`:`${selected.closeDay} 日結帳`}</p></button>
   <button className="record press" onClick={()=>onRecord(selected.id)}><Plus size={18} strokeWidth={2.4}/>記一筆</button>
  </div>

  {live.length>0?<div className="group">{live.map(r=><CapRow key={r.c.id} row={r} onOpen={()=>onOpen(r)}/>)}</div>
   :<div className="empty" style={{padding:'30px 20px'}}><div className="empty-icon"><Gauge size={24}/></div><p>{rows.length?'這個月沒有進行中的活動。':'這張卡還沒有要追蹤的活動。'}</p><button className="btn btn-gray" onClick={()=>onAddCampaign(selected.id)}><Plus size={17}/>新增活動</button></div>}
  {past.length>0&&<>
   <button className="disclosure" aria-expanded={showPast} onClick={()=>setShowPast(v=>!v)}>{showPast?'收起':'顯示'}非當期活動 {past.length}<ChevronDown size={15} style={{transform:showPast?'rotate(180deg)':undefined,transition:'transform .3s'}}/></button>
   {showPast&&<div className="group">{past.map(r=><CapRow key={r.c.id} row={r} onOpen={()=>onOpen(r)}/>)}</div>}
  </>}

  {recent.length>0&&<>
   <div className="section-head"><h2>最近消費</h2><button onClick={onAllEntries}>全部</button></div>
   <div className="group">{recent.map(e=><button key={e.id} className="cell" onClick={()=>onEntry(e)}>
    <div className="cell-main"><div className="cell-title">{e.note||'消費'}</div><div className="cell-sub">{shortDate(e.date)}</div></div>
    <span className="entry-amt num">{money(e.amount)}</span>
   </button>)}</div>
  </>}
 </div>;
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
