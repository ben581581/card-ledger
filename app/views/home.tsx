'use client';
import {startTransition,useEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,CreditCard,Gauge,Plus} from 'lucide-react';
import type {Card,Entry,Ledger} from '../../lib/ledger';
import {type Row,resetsOn,summarize,trackedRows} from '../../lib/insights';
import {indexEntriesByCampaign} from '../../lib/entry-index';
import {cardImage} from '../../lib/card-images';
import {CardArt} from '../ui/card-art';
import {Dial,Meter} from '../ui/meter';
import {Num} from '../ui/num';
import {haptic} from '../ui/haptic';
import {daysText,money,periodNames,rangeText,shortDate,statusLabel,whole} from '../format';

export const ALL='all';
type Props={
 data:Ledger;on:string;today:string;loading:boolean;selected:string;
 onSelect:(id:string)=>void;onOpen:(id:string)=>void;onCard:(id:string)=>void;onEntry:(entry:Entry)=>void;
 onRecord:(cardId?:string)=>void;onAddCampaign:(cardId?:string)=>void;onAddCard:()=>void;onHistory:()=>void;
};

export function HomeView({data,on,loading,selected,onSelect,onOpen,onCard,onEntry,onRecord,onAddCampaign,onAddCard,onHistory}:Props){
 const index=useMemo(()=>indexEntriesByCampaign(data.entries),[data.entries]);
 const rows=useMemo(()=>trackedRows(data,on,index),[data,on,index]);
 const cards=useMemo(()=>data.cards.filter(c=>!c.lookupOnly),[data.cards]);
 const summary=useMemo(()=>summarize(rows),[rows]);
 const rail=useRef<HTMLDivElement>(null);
 const ids=useMemo(()=>[ALL,...cards.map(c=>c.id)],[cards]);
 const idsRef=useRef(ids);idsRef.current=ids;
 const selectedRef=useRef(selected);selectedRef.current=selected;
 const current=cards.find(c=>c.id===selected);

 // Neighbouring slides recede as they leave the centre; the one nearest it becomes the selection.
 useEffect(()=>{
  const el=rail.current;if(!el)return;
  let frame=0;
  const paint=()=>{
   frame=0;
   const center=el.scrollLeft+el.clientWidth/2;
   let best=0,nearest=Infinity;
   [...el.children].forEach((child,i)=>{
    const slide=child as HTMLElement,distance=Math.abs(slide.offsetLeft+slide.offsetWidth/2-center);
    const d=Math.min(1,distance/(slide.offsetWidth+10));
    slide.style.transform=`scale(${1-d*.07})`;slide.style.opacity=String(1-d*.5);
    if(distance<nearest){nearest=distance;best=i;}
   });
   const id=idsRef.current[best];
   if(id&&id!==selectedRef.current&&nearest<40){haptic();selectedRef.current=id;startTransition(()=>onSelect(id));}
  };
  const onScroll=()=>{if(!frame)frame=requestAnimationFrame(paint);};
  paint();el.addEventListener('scroll',onScroll,{passive:true});
  return()=>{el.removeEventListener('scroll',onScroll);cancelAnimationFrame(frame);};
 },[onSelect,cards.length]);

 function jump(id:string,smooth=true){
  const el=rail.current,slide=el?.children[ids.indexOf(id)] as HTMLElement|undefined;
  if(el&&slide)el.scrollTo({left:slide.offsetLeft-(el.clientWidth-slide.offsetWidth)/2,behavior:smooth?'smooth':'auto'});
 }

 if(loading&&!data.cards.length)return <div style={{display:'grid',gap:14}}><div className="skeleton" style={{aspectRatio:'1.586',maxWidth:344,width:'84vw',margin:'6px auto'}}/><div className="skeleton" style={{height:240}}/></div>;
 if(!cards.length)return <div className="empty view"><div className="empty-icon"><CreditCard size={26}/></div><h3>從第一張卡開始</h3><p>新增信用卡後，每個活動還能刷多少、有沒有滿額，都會在這裡一眼看到。</p><button className="btn btn-primary" onClick={onAddCard}><Plus size={18}/>新增卡片</button></div>;

 const worst=(id:string)=>{
  const mine=rows.filter(r=>r.card.id===id&&r.p.active&&r.c.kind==='reward');
  return mine.some(r=>r.status==='near')?'near':mine.some(r=>r.status==='full')?'full':null;
 };
 const glow=current?cardImage(current):'';
 const capNear=rows.filter(r=>r.p.active&&r.c.kind==='reward'&&r.status==='near').length;
 return <>
  {current&&(glow
   ?<div className="ambient" key={`glow-${current.id}`} aria-hidden="true"><img src={glow} alt="" referrerPolicy="no-referrer"/></div>
   :<div className="ambient" key={`glow-${current.id}`} aria-hidden="true"><div style={{background:current.color}}/></div>)}
  <div className="deck" ref={rail} aria-label="總覽與卡片">
   <div className="slide">
    <button className="overview press" aria-pressed={selected===ALL} onClick={()=>jump(ALL)} aria-label={`本期還可領回饋 ${whole(summary.rewardRoom)} 元`}>
     <div className="overview-label">本期還可領回饋</div>
     <div className="overview-value num"><small>NT$</small><Num value={summary.rewardRoom}/></div>
     <div className="overview-sub num">已領 {whole(summary.earned)} / 上限 {whole(summary.capTotal)}</div>
     <Dial value={summary.capTotal?summary.earned/summary.capTotal*100:0} size={72} mini><strong className="num">{summary.capTotal?Math.round(summary.earned/summary.capTotal*100):0}<small>%</small></strong></Dial>
     <div className="overview-stats num">
      <div className={summary.full?'stop':undefined}><b>{summary.full}</b>已滿</div>
      <div className={capNear?'hot':undefined}><b>{capNear}</b>快滿</div>
      <div><b>{Math.max(0,summary.rewards-summary.full-capNear)}</b>可刷</div>
      <div className={summary.goals&&summary.goalsMet===summary.goals?'good':undefined}><b>{summary.goalsMet}/{summary.goals}</b>滿額</div>
     </div>
    </button>
   </div>
   {cards.map(card=>{
    const flag=worst(card.id);
    return <button key={card.id} className="slide press" aria-pressed={selected===card.id} aria-label={card.name} onClick={()=>selected===card.id?onCard(card.id):jump(card.id)}>
     <CardArt card={card}/>
     {flag&&<span className={`slide-flag ${flag==='near'?'hot':'stop'}`}>{flag==='near'?'快滿':'有活動已滿'}</span>}
    </button>;
   })}
  </div>
  <div className="dots" aria-hidden="true">{ids.map(id=><i key={id} className={`${id===selected?'on':''}${id!==ALL&&worst(id)==='near'?' warn':''}`}/>)}</div>

  {current
   ?<CardPanel key={current.id} card={current} data={data} rows={rows.filter(r=>r.card.id===current.id)} onOpen={onOpen} onCard={onCard} onEntry={onEntry} onRecord={onRecord} onAddCampaign={onAddCampaign} onHistory={onHistory}/>
   :<Board rows={rows} onOpen={onOpen} onHistory={onHistory} over={summary.over}/>}
 </>;
}

function Board({rows,onOpen,onHistory,over}:{rows:Row[];onOpen:(id:string)=>void;onHistory:()=>void;over:number}){
 const live=rows.filter(r=>r.p.active);
 const rewards=live.filter(r=>r.c.kind==='reward'),goals=live.filter(r=>r.c.kind==='spend');
 const sections:[string,string,Row[]][]=[
  ['full','已滿，先換卡',rewards.filter(r=>r.status==='full')],
  ['near','快滿了',rewards.filter(r=>r.status==='near')],
  ['open','還能刷',rewards.filter(r=>r.status==='open'||r.status==='unset')],
  ['goal','消費滿額',[...goals].sort((a,b)=>Number(a.status==='full')-Number(b.status==='full')||b.p.percent-a.p.percent)],
 ];
 if(!live.length)return <div className="empty view"><div className="empty-icon"><Gauge size={24}/></div><p>這個月沒有追蹤中的活動。</p></div>;
 return <div className="view">
  {over>0&&<div className="hint stop"><span className="num">已有 NT$ {whole(over)} 刷超過上限，沒有回饋</span></div>}
  {sections.map(([tone,title,list])=>list.length>0&&<section key={tone}>
   <div className="section-head"><h2 className={`tone ${tone}`}>{title}</h2><span className="num">{list.length}</span></div>
   <div className="group">{list.map(r=><CapRow key={r.c.id} row={r} showCard onOpen={()=>onOpen(r.c.id)}/>)}</div>
  </section>)}
  <button className="disclosure" style={{marginTop:10}} onClick={onHistory}>全部消費紀錄</button>
 </div>;
}

function CardPanel({card,data,rows,onOpen,onCard,onEntry,onRecord,onAddCampaign,onHistory}:{card:Card;data:Ledger;rows:Row[];onOpen:(id:string)=>void;onCard:(id:string)=>void;onEntry:(entry:Entry)=>void;onRecord:(cardId?:string)=>void;onAddCampaign:(cardId?:string)=>void;onHistory:()=>void}){
 const [showPast,setShowPast]=useState(false);
 const live=rows.filter(r=>r.p.active),past=rows.filter(r=>!r.p.active);
 const bill=live.find(r=>r.c.period==='bill');
 const recent=data.entries.map((e,i)=>({e,i})).filter(({e})=>e.cardId===card.id).sort((a,b)=>b.e.date.localeCompare(a.e.date)||b.i-a.i).slice(0,4).map(x=>x.e);
 return <div className="view">
  <div className="card-line">
   <button onClick={()=>onCard(card.id)} style={{minWidth:0}}><h2>{card.name}</h2><p>{card.bank||'信用卡'} · {bill?`帳單 ${rangeText(bill.p.start,bill.p.end)}`:`每月 ${card.closeDay} 日結帳`}</p></button>
   <button className="pill" onClick={()=>onRecord(card.id)}><Plus size={15} strokeWidth={2.6}/>記一筆</button>
  </div>
  {live.length>0?<div className="group">{live.map(r=><CapRow key={r.c.id} row={r} onOpen={()=>onOpen(r.c.id)}/>)}</div>
   :<div className="empty" style={{padding:'30px 20px'}}><div className="empty-icon"><Gauge size={24}/></div><p>{rows.length?'這個月沒有進行中的活動。':'這張卡還沒有要追蹤的活動。'}</p><button className="btn btn-gray" onClick={()=>onAddCampaign(card.id)}><Plus size={17}/>新增活動</button></div>}
  {past.length>0&&<>
   <button className="disclosure" aria-expanded={showPast} onClick={()=>setShowPast(v=>!v)}>{showPast?'收起':'顯示'}非當期活動 {past.length}<ChevronDown size={15}/></button>
   {showPast&&<div className="group">{past.map(r=><CapRow key={r.c.id} row={r} onOpen={()=>onOpen(r.c.id)}/>)}</div>}
  </>}
  {recent.length>0&&<>
   <div className="section-head"><h2>最近消費</h2><button onClick={onHistory}>全部</button></div>
   <div className="group">{recent.map(e=><button key={e.id} className="cell" onClick={()=>onEntry(e)}>
    <div className="cell-main"><span className="cell-title">{e.note||'消費'}</span><span className="cell-sub">{shortDate(e.date)}</span></div>
    <span className="cell-end">{money(e.amount)}</span>
   </button>)}</div>
  </>}
 </div>;
}

/** One campaign: what is left comes first, because that is the decision. */
export function CapRow({row:r,showCard=false,onOpen}:{row:Row;showCard?:boolean;onOpen:()=>void}){
 const reward=r.c.kind==='reward',done=r.status==='full';
 const reset=resetsOn(r);
 const when=!r.p.active?rangeText(r.p.start,r.p.end):done?(reset?`${shortDate(reset)} 重置`:''):daysText(r.days);
 // Once full, the only useful fact left is when it comes back.
 const sub=[showCard?r.card.name:'',done?'':reward?`${r.c.rate}%`:periodNames[r.c.period],when].filter(Boolean);
 const label=done?(reward?(r.p.over>0?`超刷 ${whole(r.p.over)}`:'回饋已領滿'):`已刷 ${whole(r.p.spend)}`):reward?'還能刷':'還差';
 const value=done?(reward?'已滿':'已達標'):r.p.spendRemaining===null?'—':whole(r.p.spendRemaining);
 return <button className={`cap s-${r.status}${reward?'':' is-goal'}`} onClick={onOpen} aria-label={`${r.card.name} ${r.c.name}，${statusLabel(r)}，${label} ${value}`}>
  <div className="cap-top">
   {showCard&&<CardArt card={r.card} compact/>}
   <div className="cap-main"><span className="cap-name">{r.c.name}</span><span className="cap-sub">{sub.map((text,i)=><span key={text} className={text===when&&r.days<=5&&r.p.active&&!done?'hot':undefined}>{i>0?' · ':''}{text}</span>)}</span></div>
   <div className="cap-val"><strong>{value}</strong><span>{label}</span></div>
  </div>
  <Meter value={r.p.percent} goal={!reward} done={done} ghost={!r.p.active}/>
 </button>;
}
