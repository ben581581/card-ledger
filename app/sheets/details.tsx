'use client';
import {useMemo,useState} from 'react';
import {ChevronRight,Pencil,Plus,Receipt} from 'lucide-react';
import type {Campaign,Card,Entry,Ledger} from '../../lib/ledger';
import {progress,tracksProgress} from '../../lib/ledger';
import {channelMatches} from '../../lib/channels';
import {displayPeriod} from '../../lib/display-period';
import {type Row,offerActive,pace,rateText,resetsOn} from '../../lib/insights';
import {RegistrationNotice} from '../registration-notice';
import {CardArt} from '../ui/card-art';
import {Dial} from '../ui/meter';
import {Num} from '../ui/num';
import {daysText,money,periodNames,shortDate,shortRate,statusLabel,whole} from '../format';

function EntryList({entries,cards,onEntry}:{entries:Entry[];cards:Map<string,Card>;onEntry:(e:Entry)=>void}){
 return <div className="group">{entries.map(e=><button key={e.id} className="cell" onClick={()=>onEntry(e)}>
  <div className="cell-main"><span className="cell-title">{e.note||'消費'}</span><span className="cell-sub">{shortDate(e.date)}{cards.size>1?` · ${cards.get(e.cardId)?.name||''}`:''}{e.reward!==null?` · 實際回饋 ${money(e.reward)}`:''}</span></div>
  <span className="cell-end">{money(e.amount)}</span>
 </button>)}</div>;
}

export function CampaignDetail({row:r,data,today,onEntry,onEdit,onEditEntry}:{row:Row;data:Ledger;today:string;onEntry:()=>void;onEdit:()=>void;onEditEntry:(e:Entry)=>void}){
 const reward=r.c.kind==='reward',done=r.status==='full';
 const counted=data.entries.filter(e=>e.cardId===r.card.id&&e.campaignIds.includes(r.c.id)&&e.date>=r.p.start&&e.date<=r.p.end).sort((a,b)=>b.date.localeCompare(a.date));
 const forecast=pace(r,today),reset=resetsOn(r);
 const tag=r.status==='full'?(reward?'full':'done'):r.status==='near'?'near':r.p.active?(reward?'open':'goal'):'';
 return <>
  <div className="detail-hero">
   <Dial value={r.p.percent} size={196} kind={reward?'reward':'goal'}><strong className="num">{Math.round(r.p.percent)}<small>%</small></strong><span>{reward?'已使用':'已達成'}</span></Dial>
   <h3>{r.c.name}</h3>
   <p>{r.card.name} · {periodNames[r.c.period]} · <span className={`tag ${tag}`}>{statusLabel(r)}</span></p>
   <div className="detail-big">{done?(reward?'本期回饋已領滿':'本期已達標'):reward?'還能刷':'達標還差'}{!done&&<b>{r.p.spendRemaining===null?'請設定回饋率':<>NT$ <Num value={r.p.spendRemaining}/></>}</b>}</div>
  </div>
  {done&&reward&&reset&&r.p.active&&<div className="hint warn"><span>先換別張卡，{shortDate(reset)} 重新計算。{r.p.over>0?`已超刷 NT$ ${whole(r.p.over)}。`:''}</span></div>}
  {forecast?.kind==='cap'&&<div className="hint warn"><span>照目前速度，約 {shortDate(forecast.date)} 刷滿。</span></div>}
  {forecast?.kind==='goal'&&<div className="hint"><span className="num">剩下每天刷 NT$ {whole(forecast.perDay)} 就能達標。</span></div>}
  <dl className="kv">
   <div><dt>{reward?'總共可刷':'消費目標'}</dt><dd className="num">{r.p.spendLimit===null?'—':`NT$ ${whole(r.p.spendLimit)}`}</dd></div>
   <div><dt>本期已刷</dt><dd className="num">NT$ {money(r.p.spend)}</dd></div>
   {reward&&<div><dt>已領 / 上限</dt><dd className="num">{money(r.p.earned)} / {money(r.c.target)}</dd></div>}
   {reward&&<div><dt>回饋率</dt><dd className="num">{r.c.rate}%</dd></div>}
   <div className="wide"><dt>計算期間</dt><dd>{displayPeriod(r.c,r.p)}{r.p.active&&<span style={{color:'var(--t2)',fontWeight:400}}> · {daysText(r.days)}</span>}</dd></div>
  </dl>
  {r.c.registration&&<div style={{marginTop:10}}><RegistrationNotice value={r.c.registration}/></div>}
  {r.c.notes&&<><div className="form-label">條件備註</div><div className="prose">{r.c.notes}</div></>}
  <div className="btn-row" style={{marginTop:16}}><button className="btn btn-primary" onClick={onEntry}><Plus size={18}/>記一筆</button><button className="btn btn-gray" onClick={onEdit}><Pencil size={16}/>編輯活動</button></div>
  <div className="section-head"><h2>本期計入</h2><span className="num">{counted.length} 筆</span></div>
  {counted.length?<EntryList entries={counted} cards={new Map([[r.card.id,r.card]])} onEntry={onEditEntry}/>:<p className="caption">這個週期還沒有計入的消費。</p>}
 </>;
}

export function OfferDetail({c,card,data,today,query,onEntry,onEdit}:{c:Campaign;card:Card;data:Ledger;today:string;query:string;onEntry:()=>void;onEdit:()=>void}){
 const p=useMemo(()=>progress(c,card,data.entries.filter(e=>e.campaignIds.includes(c.id)),today),[c,card,data.entries,today]);
 const channels=c.channels||[],hits=query?channels.filter(ch=>channelMatches(ch,query)):[];
 const ordered=[...hits,...channels.filter(ch=>!hits.includes(ch))];
 const tracked=!card.lookupOnly&&tracksProgress(c);
 const capacity=!p.active?'非活動期間':!tracked?(c.kind==='unlimited'&&!c.queryOnly&&!card.lookupOnly?'回饋無上限':'僅查詢 · 依官方條件'):c.kind==='spend'?(p.remaining===0?'已達標':`滿額還差 NT$ ${whole(p.spendRemaining??0)}`):p.remaining===0?'本期已用滿':p.spendRemaining===null?'未設定回饋率':`還能刷 NT$ ${whole(p.spendRemaining)}`;
 return <>
  <div className="card-hero"><CardArt card={card}/></div>
  <div className="detail-hero" style={{paddingTop:0}}>
   <p style={{marginTop:0}}>{card.name}</p>
   <h3 style={{marginTop:2}}>{c.name}</h3>
   <div className="detail-big"><b>{rateText(c)}</b>{capacity}</div>
  </div>
  {c.registration&&<div style={{marginTop:6}}><RegistrationNotice value={c.registration}/></div>}
  <dl className="kv"><div className="wide"><dt>適用期間</dt><dd>{displayPeriod(c,p)}</dd></div></dl>
  {channels.length>0&&<><div className="form-label">適用通路 · {channels.length}</div><div className="tags">{ordered.map(ch=><span key={ch} className={hits.includes(ch)?'hit':undefined}>{ch}</span>)}</div></>}
  {c.notes&&<><div className="form-label">條件備註</div><div className="prose">{c.notes}</div></>}
  <div className="btn-row" style={{marginTop:18,gridTemplateColumns:card.lookupOnly?'1fr':undefined}}>{!card.lookupOnly&&<button className="btn btn-primary" onClick={onEntry}><Plus size={18}/>記一筆</button>}<button className="btn btn-gray" onClick={onEdit}><Pencil size={16}/>編輯優惠</button></div>
  <p className="caption">實際資格、名額與上限以銀行官方公告為準。</p>
 </>;
}

export function CardDetail({card,data,today,onEntry,onEdit,onAddCampaign,onOffer,onEditEntry}:{card:Card;data:Ledger;today:string;onEntry:()=>void;onEdit:()=>void;onAddCampaign:()=>void;onOffer:(c:Campaign)=>void;onEditEntry:(e:Entry)=>void}){
 const offers=data.campaigns.filter(c=>c.cardId===card.id).sort((a,b)=>Number(offerActive(b,card,today))-Number(offerActive(a,card,today)));
 const entries=data.entries.filter(e=>e.cardId===card.id).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
 return <>
  <div className="card-hero"><CardArt card={card}/></div>
  <div className="detail-hero" style={{paddingTop:0}}><h3 style={{marginTop:0}}>{card.name}</h3><p>{card.bank||'信用卡'}{card.lookupOnly?' · 只查詢優惠':` · 每月 ${card.closeDay} 日結帳`}</p></div>
  <div className="btn-row" style={{marginTop:6,gridTemplateColumns:card.lookupOnly?'1fr':undefined}}>{!card.lookupOnly&&<button className="btn btn-primary" onClick={onEntry}><Plus size={18}/>記一筆</button>}<button className="btn btn-gray" onClick={onEdit}><Pencil size={16}/>編輯卡片</button></div>
  <div className="section-head"><h2>優惠活動</h2><button onClick={onAddCampaign}>新增</button></div>
  {offers.length?<div className="group">{offers.map(c=>{const active=offerActive(c,card,today);return <button key={c.id} className="cell" style={{opacity:active?1:.5}} onClick={()=>onOffer(c)}>
   <div className="cell-main"><span className="cell-title">{c.name}</span><span className="cell-sub clip">{c.kind==='unlimited'||c.queryOnly||card.lookupOnly?'僅查詢':c.kind==='reward'?`上限 NT$ ${money(c.target)}`:`滿 NT$ ${money(c.target)}`} · {c.kind==='unlimited'?'長期':periodNames[c.period]}{!active&&' · 非當期'}</span></div>
   <span className={`rate num${active?'':' dim'}`}>{shortRate(c)}</span><ChevronRight size={15} className="chev"/>
  </button>;})}</div>:<p className="caption">新增回饋上限、滿額門檻或無上限優惠，並填入適用通路。</p>}
  {!card.lookupOnly&&<><div className="section-head"><h2>最近消費</h2></div>
  {entries.length?<EntryList entries={entries} cards={new Map([[card.id,card]])} onEntry={onEditEntry}/>:<p className="caption">尚無消費紀錄。</p>}</>}
 </>;
}

const pageSize=60;
export function History({data,onEntry,onRecord}:{data:Ledger;onEntry:(e:Entry)=>void;onRecord:()=>void}){
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
  {tracked.length>1&&<div className="chips" style={{marginTop:0}}><button className="chip" aria-pressed={cardId==='all'} onClick={()=>{setCardId('all');setLimit(pageSize);}}>全部</button>{tracked.map(c=><button key={c.id} className="chip" aria-pressed={cardId===c.id} onClick={()=>{setCardId(c.id);setLimit(pageSize);}}>{c.name}</button>)}</div>}
  {!entries.length&&<div className="empty"><div className="empty-icon"><Receipt size={24}/></div><h3>還沒有消費紀錄</h3><p>記下一筆消費，額度與滿額進度會自動更新。</p><button className="btn btn-primary" disabled={!data.cards.length} onClick={onRecord}><Plus size={18}/>記一筆</button></div>}
  {months.map(([month,{total,rows}])=>{
   if(shown>=limit)return null;
   const visible=rows.slice(0,limit-shown);shown+=visible.length;
   const [y,m]=month.split('-');
   return <section key={month}>
    <div className="section-head"><h2>{y} 年 {Number(m)} 月</h2><span className="num">NT$ {money(total/100)}</span></div>
    <div className="group">{visible.map(e=>{const card=cards.get(e.cardId);const names=e.campaignIds.map(id=>campaigns.get(id)?.name).filter(Boolean);return <button key={e.id} className="cell" onClick={()=>onEntry(e)}>
     {card?<CardArt card={card} compact/>:<Receipt size={20}/>}
     <div className="cell-main"><span className="cell-title">{e.note||'消費'}</span><span className="cell-sub clip">{shortDate(e.date)} · {card?.name}{names.length?` · ${names.join('、')}`:' · 未計入活動'}</span></div>
     <span className="cell-end">{money(e.amount)}</span>
    </button>;})}</div>
   </section>;
  })}
  {entries.length>limit&&<button className="btn btn-gray btn-block" style={{marginTop:14}} onClick={()=>setLimit(v=>v+pageSize)}>顯示更多（{entries.length-limit}）</button>}
 </>;
}
