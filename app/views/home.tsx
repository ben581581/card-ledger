'use client';
import {useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight,Plus} from 'lucide-react';
import type {Card,Entry,Ledger} from '../../lib/ledger';
import {type Row,type Status,resetsOn,trackedRows} from '../../lib/insights';
import {indexEntriesByCampaign} from '../../lib/entry-index';
import {CardArt} from '../ui/card-art';
import {Meter} from '../ui/meter';
import {daysText,money,periodNames,rangeText,shortDate,statusLabel,whole} from '../format';

export const ALL='all';
const months=['一','二','三','四','五','六','七','八','九','十','十一','十二'];
const rank:Record<Status,number>={near:0,full:1,open:2,unset:3,upcoming:4,ended:5};

type Props={
 data:Ledger;on:string;today:string;loading:boolean;sync:{label:string;state:'ok'|'busy'|'bad'};
 onShift:(months:number)=>void;onToday:()=>void;onSync:()=>void;
 onOpen:(id:string)=>void;onCard:(id:string)=>void;onEntry:(entry:Entry)=>void;
 onRecord:(cardId?:string)=>void;onAddCampaign:(cardId?:string)=>void;onAddCard:()=>void;onHistory:()=>void;
};

export function HomeView({data,on,today,loading,sync,onShift,onToday,onSync,onOpen,onCard,onEntry,onRecord,onAddCampaign,onAddCard,onHistory}:Props){
 const index=useMemo(()=>indexEntriesByCampaign(data.entries),[data.entries]);
 const rows=useMemo(()=>trackedRows(data,on,index),[data,on,index]);
 const cards=useMemo(()=>data.cards.filter(c=>!c.lookupOnly),[data.cards]);
 const [showPast,setShowPast]=useState(false);

 const [y,m,d]=on.split('-').map(Number);
 const length=new Date(Date.UTC(y,m,0)).getUTCDate();
 const live=rows.filter(r=>r.p.active);
 // Cards with the most pressing activity lead; within a card the same order holds.
 const groups=cards.map(card=>({card,rows:live.filter(r=>r.card.id===card.id).sort((a,b)=>rank[a.status]-rank[b.status])}))
  .filter(g=>g.rows.length)
  .sort((a,b)=>rank[a.rows[0].status]-rank[b.rows[0].status]);
 const idle=cards.filter(c=>!groups.some(g=>g.card.id===c.id));
 const past=rows.filter(r=>!r.p.active);
 const recent=data.entries.map((e,i)=>({e,i})).sort((a,b)=>b.e.date.localeCompare(a.e.date)||b.i-a.i).slice(0,5).map(x=>x.e);

 return <div className="view home">
  <header className="mast">
   <div className="mast-top">
    <span className="kicker">CARDI<i/>{y}</span>
    <button className={`sync ${sync.state}`} onClick={onSync} disabled={sync.state==='busy'} aria-label={`雲端同步：${sync.label}，點一下重新整理`}><i/>{sync.label}</button>
   </div>
   <div className="mast-month">
    <button className="mast-arrow" aria-label="上個月" onClick={()=>onShift(-1)}><ChevronLeft size={20} strokeWidth={1.5}/></button>
    <button className="mast-title" onClick={onToday} aria-label={`${m} 月，回到本月`}><h1>{months[m-1]}月</h1></button>
    <button className="mast-arrow" aria-label="下個月" onClick={()=>onShift(1)}><ChevronRight size={20} strokeWidth={1.5}/></button>
   </div>
   {/* Where in the month we are: the one fact every cap is measured against. */}
   <div className="mast-rule" style={{'--day':(d-.5)/length} as React.CSSProperties} aria-label={`第 ${d} 日，共 ${length} 日`}>
    <span className="num">第 {d} 日</span><i/><span className="num">{on===today?`餘 ${length-d} 日`:`共 ${length} 日`}</span>
   </div>
  </header>

  {loading&&!data.cards.length?<div className="skeleton" style={{height:260,marginTop:28}}/>
  :!cards.length?<div className="empty"><h3>從第一張卡開始</h3><p>新增信用卡，每個活動還能刷多少、有沒有滿額，都會在這裡一眼看到。</p><button className="btn btn-primary" onClick={onAddCard}><Plus size={17}/>新增卡片</button></div>
  :<>

   {groups.map(({card,rows},i)=><section key={card.id} className="ledger" style={{'--i':i} as React.CSSProperties}>
    <header className="ledger-head">
     <button className="ledger-card press" onClick={()=>onCard(card.id)} aria-label={`${card.name} 卡片詳情`}><CardArt card={card} compact/></button>
     <button className="ledger-title" onClick={()=>onCard(card.id)}><h2>{card.name}</h2><p>{billLine(card,rows)}</p></button>
     <button className="ledger-add" onClick={()=>onRecord(card.id)} aria-label={`記一筆 ${card.name}`}><Plus size={16} strokeWidth={1.8}/></button>
    </header>
    {rows.map(r=><CapRow key={r.c.id} row={r} onOpen={()=>onOpen(r.c.id)}/>)}
   </section>)}

   {!groups.length&&<p className="caption" style={{marginTop:32}}>這個月沒有追蹤中的活動。<button className="link" onClick={()=>onAddCampaign()}>新增活動</button></p>}
   {idle.length>0&&<p className="aside">沒有進行中活動：{idle.map((c,i)=><button key={c.id} onClick={()=>onCard(c.id)}>{i>0?'、':''}{c.name}</button>)}</p>}

   {past.length>0&&<>
    <button className="more" aria-expanded={showPast} onClick={()=>setShowPast(v=>!v)}>{showPast?'收起':'顯示'}非當期活動 <span className="num">{past.length}</span></button>
    {showPast&&<section className="ledger is-past">{past.map(r=><CapRow key={r.c.id} row={r} showCard onOpen={()=>onOpen(r.c.id)}/>)}</section>}
   </>}

   {recent.length>0&&<section className="journal">
    <header className="journal-head"><h2>最近消費</h2><button onClick={onHistory}>全部紀錄</button></header>
    {recent.map(e=>{const card=data.cards.find(c=>c.id===e.cardId);return <button key={e.id} className="journal-row" onClick={()=>onEntry(e)}>
     <span className="journal-date num">{shortDate(e.date)}</span>
     <span className="journal-main"><b>{e.note||'消費'}</b><small>{card?.name}</small></span>
     <span className="journal-amt num">{money(e.amount)}</span>
    </button>;})}
   </section>}
  </>}
 </div>;
}

function billLine(card:Card,rows:Row[]){
 const bill=rows.find(r=>r.c.period==='bill');
 return [card.bank,bill?`帳單 ${rangeText(bill.p.start,bill.p.end)}`:`${card.closeDay} 日結帳`].filter(Boolean).join(' · ');
}

/** One campaign: what is left comes first, because that is the decision. A used-up cap gets stamped. */
export function CapRow({row:r,showCard=false,onOpen}:{row:Row;showCard?:boolean;onOpen:()=>void}){
 const reward=r.c.kind==='reward',done=r.status==='full';
 const reset=resetsOn(r);
 const when=!r.p.active?rangeText(r.p.start,r.p.end):done?(reset?`${shortDate(reset)} 重置`:''):daysText(r.days);
 const sub=[showCard?r.card.name:'',reward?`${r.c.rate}%`:periodNames[r.c.period],when].filter(Boolean);
 const label=done?(reward?(r.p.over>0?`超刷 ${whole(r.p.over)}`:'回饋已領滿'):`已刷 ${whole(r.p.spend)}`):reward?'還能刷':'還差';
 const used=reward?`${whole(r.p.value)} / ${whole(r.c.target)}`:`${whole(r.p.spend)} / ${whole(r.c.target)}`;
 return <button className={`cap s-${r.status}${reward?'':' is-goal'}`} onClick={onOpen} aria-label={`${r.card.name} ${r.c.name}，${statusLabel(r)}，${label}`}>
  <div className="cap-top">
   <div className="cap-main"><span className="cap-name">{r.c.name}</span><span className="cap-sub">{sub.map((text,i)=><span key={text} className={text===when&&r.days<=5&&r.p.active&&!done?'hot':undefined}>{i>0?' · ':''}{text}</span>)}</span></div>
   <div className="cap-val">
    {done?<span className={`seal${reward?'':' is-done'}`} aria-hidden="true">{reward?'滿':'達'}</span>
     :<strong className="num">{r.p.spendRemaining===null?'—':whole(r.p.spendRemaining)}</strong>}
    <span>{label}</span>
   </div>
  </div>
  <Meter value={r.p.percent} goal={!reward} done={done} ghost={!r.p.active}/>
  <span className="cap-used num" aria-hidden="true">{used}</span>
 </button>;
}
