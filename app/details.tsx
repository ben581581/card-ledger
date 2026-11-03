'use client';
import {Plus,Pencil,ChevronRight} from 'lucide-react';
import type {Card,Campaign,Entry,Ledger} from '../lib/ledger';
import {channelMatches} from '../lib/channels';
import {displayPeriod} from '../lib/display-period';
import {type Offer,type Row,offerActive,rateText} from '../lib/insights';
import {CardArtwork} from './card-artwork';
import {RegistrationNotice} from './registration-notice';
import {capacityText} from './views/offers';
import {daysText,money,periodNames,shortDate,statusLabel,whole} from './format';

function Ring({percent}:{percent:number}){
 const r=70,len=2*Math.PI*r;
 return <div className="ring"><svg viewBox="0 0 168 168" aria-hidden="true"><circle className="bg" cx="84" cy="84" r={r}/><circle className="fg" cx="84" cy="84" r={r} strokeDasharray={len} strokeDashoffset={len*(1-Math.min(100,percent)/100)}/></svg>
  <div className="ring-center"><strong className="num">{Math.round(percent)}<small>%</small></strong><span>已使用</span></div></div>;
}

function EntryList({entries,cards,onEntry}:{entries:Entry[];cards:Map<string,Card>;onEntry:(e:Entry)=>void}){
 return <div className="group">{entries.map(e=><button key={e.id} className="cell" onClick={()=>onEntry(e)}>
  <div className="cell-main"><div className="cell-title">{e.note||'消費'}</div><div className="cell-sub">{shortDate(e.date)}{cards.size>1?` · ${cards.get(e.cardId)?.name||''}`:''}{e.reward!==null?` · 實際回饋 ${money(e.reward)}`:''}</div></div>
  <span className="entry-amt num">{money(e.amount)}</span>
 </button>)}</div>;
}

export function CampaignDetail({row:r,data,onEntry,onEdit,onEditEntry}:{row:Row;data:Ledger;onEntry:()=>void;onEdit:()=>void;onEditEntry:(e:Entry)=>void}){
 const reward=r.c.kind==='reward';
 const counted=data.entries.filter(e=>e.cardId===r.card.id&&e.campaignIds.includes(r.c.id)&&e.date>=r.p.start&&e.date<=r.p.end).sort((a,b)=>b.date.localeCompare(a.date));
 return <div className={`s-${r.status}`}>
  <div className="detail-hero">
   <Ring percent={r.p.percent}/>
   <h3>{r.c.name}</h3>
   <p>{r.card.name} · {periodNames[r.c.period]} · <span className={`tag tag-${r.status==='full'?'full':r.status==='near'?'near':r.p.active?'open':'muted'}`}>{statusLabel(r)}</span></p>
   <div className="big">{r.status==='full'?(reward?'本期回饋已用滿':'本期已達標'):reward?'還能刷':'達標還差'}{r.status!=='full'&&<b className="num">{r.p.spendRemaining===null?'請設定回饋率':`NT$ ${money(r.p.spendRemaining)}`}</b>}</div>
  </div>
  <dl className="kv">
   <div><dt>{reward?'總共可刷':'消費目標'}</dt><dd className="num">{r.p.spendLimit===null?'—':`NT$ ${whole(r.p.spendLimit)}`}</dd></div>
   <div><dt>本期已刷</dt><dd className="num">NT$ {money(r.p.spend)}</dd></div>
   {reward&&<div><dt>已估回饋 / 上限</dt><dd className="num">{money(r.p.value)} / {money(r.c.target)}</dd></div>}
   {reward&&<div><dt>回饋率</dt><dd className="num">{r.c.rate}%</dd></div>}
   <div style={reward?{gridColumn:'1/-1'}:undefined}><dt>計算期間</dt><dd style={{fontSize:16}}>{displayPeriod(r.c,r.p)}{r.p.active&&<span style={{color:'var(--text-2)',fontWeight:400}}> · {daysText(r.days)}</span>}</dd></div>
  </dl>
  {r.c.registration&&<div style={{marginTop:12}}><RegistrationNotice value={r.c.registration}/></div>}
  {r.c.notes&&<><div className="form-label">條件備註</div><div className="prose">{r.c.notes}</div></>}
  <div className="btn-row" style={{marginTop:20}}><button className="btn btn-primary" onClick={onEntry}><Plus size={18}/>記一筆</button><button className="btn btn-gray" onClick={onEdit}><Pencil size={16}/>編輯活動</button></div>
  <div className="section-head"><h2>本期計入</h2><span className="num">{counted.length} 筆</span></div>
  {counted.length?<EntryList entries={counted} cards={new Map([[r.card.id,r.card]])} onEntry={onEditEntry}/>:<p className="caption">這個週期還沒有計入的消費。</p>}
 </div>;
}

export function OfferDetail({offer:o,query,onEntry,onEdit}:{offer:Offer;query:string;onEntry:()=>void;onEdit:()=>void}){
 const channels=o.c.channels||[];
 const hits=query?channels.filter(ch=>channelMatches(ch,query)):[];
 const ordered=[...hits,...channels.filter(ch=>!hits.includes(ch))];
 return <>
  <div className="card-hero"><CardArtwork card={o.card}/></div>
  <div className="detail-hero" style={{paddingTop:0}}>
   <p style={{marginTop:0}}>{o.card.name}</p>
   <h3>{o.c.name}</h3>
   <div className="big"><b className="num" style={{color:o.usable?'var(--accent)':undefined,fontSize:40}}>{rateText(o.c)}</b>{capacityText(o)}</div>
  </div>
  {o.c.registration&&<div style={{marginBottom:12}}><RegistrationNotice value={o.c.registration}/></div>}
  <dl className="kv"><div style={{gridColumn:'1/-1'}}><dt>適用期間</dt><dd style={{fontSize:16}}>{displayPeriod(o.c,o.p)}</dd></div></dl>
  {channels.length>0&&<><div className="form-label">適用通路 · {channels.length}</div><div className="tags">{ordered.map(ch=><span key={ch} className={hits.includes(ch)?'hit':undefined}>{ch}</span>)}</div></>}
  {o.c.notes&&<><div className="form-label">條件備註</div><div className="prose">{o.c.notes}</div></>}
  <div className="btn-row" style={{marginTop:22,gridTemplateColumns:o.card.lookupOnly?'1fr':undefined}}>{!o.card.lookupOnly&&<button className="btn btn-primary" onClick={onEntry}><Plus size={18}/>記一筆</button>}<button className="btn btn-gray" onClick={onEdit}><Pencil size={16}/>編輯優惠</button></div>
  <p className="caption">實際資格、名額與上限以銀行官方公告為準。</p>
 </>;
}

export function CardDetail({card,data,today,onEntry,onEdit,onAddCampaign,onEditCampaign,onEditEntry}:{card:Card;data:Ledger;today:string;onEntry:()=>void;onEdit:()=>void;onAddCampaign:()=>void;onEditCampaign:(c:Campaign)=>void;onEditEntry:(e:Entry)=>void}){
 const offers=data.campaigns.filter(c=>c.cardId===card.id).sort((a,b)=>Number(offerActive(b,card,today))-Number(offerActive(a,card,today)));
 const entries=data.entries.filter(e=>e.cardId===card.id).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
 return <>
  <div className="card-hero"><CardArtwork card={card}/></div>
  <div className="detail-hero" style={{paddingTop:0}}><h3>{card.name}</h3><p>{card.bank||'信用卡'}{card.lookupOnly?' · 僅查詢優惠':` · 每月 ${card.closeDay} 日結帳`}</p></div>
  <div className="btn-row" style={{gridTemplateColumns:card.lookupOnly?'1fr':undefined}}>{!card.lookupOnly&&<button className="btn btn-primary" onClick={onEntry}><Plus size={18}/>記一筆</button>}<button className="btn btn-gray" onClick={onEdit}><Pencil size={16}/>編輯卡片</button></div>
  <div className="section-head"><h2>優惠活動</h2><button onClick={onAddCampaign}>新增</button></div>
  {offers.length?<div className="group">{offers.map(c=>{const active=offerActive(c,card,today);return <button key={c.id} className="cell" style={{opacity:active?1:.5}} onClick={()=>onEditCampaign(c)}>
   <div className="cell-main"><div className="cell-title">{c.name}</div><div className="cell-sub">{c.kind==='unlimited'||c.queryOnly||card.lookupOnly?'僅查詢':c.kind==='reward'?`上限 NT$ ${money(c.target)}`:`滿 NT$ ${money(c.target)}`} · {c.kind==='unlimited'?'長期':periodNames[c.period]}{!active&&' · 非當期'}</div></div>
   <span className={`rate-pill num${active?'':' dim'}`}>{rateText(c)}</span><ChevronRight size={16} className="chev"/>
  </button>;})}</div>:<p className="caption">新增回饋上限、滿額門檻或無上限優惠，並填入適用通路。</p>}
  {!card.lookupOnly&&<><div className="section-head"><h2>最近消費</h2></div>
  {entries.length?<EntryList entries={entries} cards={new Map([[card.id,card]])} onEntry={onEditEntry}/>:<p className="caption">尚無消費紀錄。</p>}</>}
 </>;
}
