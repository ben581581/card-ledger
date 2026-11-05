'use client';
import {useMemo,useState} from 'react';
import {ArrowUpRight,CalendarCheck,Check,CreditCard,Gift,ShieldCheck} from 'lucide-react';
import type {Ledger} from '../../lib/ledger';
import {type CatalogCard,type Perk,heldCard,perkActive,whatIf} from '../../lib/catalog';
import {CatalogFace} from '../ui/card-art';
import {rate,shortDate,whole} from '../format';

const capPeriod:Record<NonNullable<Perk['capPeriod']>,string>={bill:'每期',month:'每月',quarter:'每季',year:'每年',event:'活動期間'};

/** Everything needed to decide on a card, ending in the two ways forward: add it or go to the bank. */
export function CatalogDetail({entry,data,today,busy,onAdd,onOpenHeld}:{entry:CatalogCard;data:Ledger;today:string;busy:boolean;onAdd:(entry:CatalogCard,closeDay:number,lookupOnly:boolean)=>void;onOpenHeld:(id:string)=>void}){
 const held=heldCard(entry,data.cards);
 const value=useMemo(()=>whatIf(entry,data,today),[entry,data,today]);
 const [adding,setAdding]=useState(false),[closeDay,setCloseDay]=useState('15'),[lookup,setLookup]=useState(false);
 const perks=entry.perks.filter(perk=>perkActive(perk,today)||(perk.start&&perk.start>today));
 const net=value?value.annual-entry.fee:0;
 return <>
  <div className="card-hero"><CatalogFace entry={entry}/></div>
  <div className="detail-hero" style={{paddingTop:0}}><h3 style={{marginTop:0}}>{entry.bank} {entry.name}</h3><p>{entry.summary}</p></div>
  <dl className="spec">
   <div><dt>年費</dt><dd>{entry.fee?whole(entry.fee):'免'}</dd></div>
   {entry.miles?<div style={{gridColumn:'span 2'}}><dt>累積</dt><dd style={{fontSize:14,lineHeight:1.9}}>{entry.miles}</dd></div>:<>
    <div><dt>國內</dt><dd>{rate(entry.domestic)}<small>%</small></dd></div>
    <div><dt>海外</dt><dd>{rate(entry.overseas)}<small>%</small></dd></div>
   </>}
  </dl>
  {!held&&value&&<div className="value-card">
   <span>用你近 {value.days} 天的 {value.entries} 筆消費試算</span>
   <strong className={value.uplift>0?undefined:'zero'}>{value.uplift>0?`可多拿 NT$ ${whole(value.uplift)}`:'不會比現在多'}</strong>
   <p>{value.uplift<=0?'以你目前的消費習慣，手上的卡已經比較好。':value.reliable?`其中 ${value.wins} 筆更划算，一年約多 NT$ ${whole(value.annual)}${entry.fee?`，扣年費後${net>0?`仍多 NT$ ${whole(net)}`:'不划算'}`:''}。`:`只有 ${value.wins} 筆更划算，資料還少，先不換算成一年。`}</p>
  </div>}
  {perks.length>0&&<>
   <div className="section-head"><h2>回饋與上限</h2><span className="num">{perks.length} 項</span></div>
   <div className="group">{perks.map(perk=><div key={perk.name+perk.rate} className="perk">
    <div className="perk-top"><b>{perk.name}</b><span className="rate num">{perk.label||`${perk.addon?'+':''}${rate(perk.rate)}%`}</span></div>
    <div className="perk-note">{[perk.cap?`${capPeriod[perk.capPeriod||'bill']}上限 ${whole(perk.cap)}`:'無上限',perk.plan?`方案：${perk.plan}`:'',perk.end?`至 ${perk.end.slice(0,4)}/${shortDate(perk.end)}`:'',perk.reg?'需登錄':''].filter(Boolean).join(' · ')}</div>
    {perk.note&&<div className="perk-note">{perk.note}</div>}
   </div>)}</div>
  </>}
  {entry.welcome&&<>
   <div className="section-head"><h2>首刷禮</h2>{entry.welcomeEnd&&<span>至 {shortDate(entry.welcomeEnd)}</span>}</div>
   <div className="reg"><Gift size={18} style={{color:'var(--near)'}}/><div>{entry.welcome}</div></div>
  </>}
  <div className="section-head"><h2>申辦須知</h2></div>
  <dl className="kv">
   <div className="wide"><dt>免年費條件</dt><dd style={{fontWeight:400,fontSize:14}}>{entry.waiver||(entry.fee?'請見銀行公告':'持卡期間免年費')}</dd></div>
   <div><dt>海外手續費</dt><dd className="num">{entry.fxFee?`約 ${entry.fxFee}%`:'免收'}</dd></div>
   <div><dt>最低年收</dt><dd className="num">{entry.income?`${entry.income/10000} 萬`:'未列'}</dd></div>
  </dl>
  {held
   ?<button className="btn btn-gray btn-block" style={{marginTop:18}} onClick={()=>onOpenHeld(held.id)}><Check size={17}/>已在我的卡片</button>
   :adding?<>
    <div className="form-label">加入我的卡片</div>
    <div className="form-group">
     <label className="field"><span style={{flex:1}}>只查詢優惠，不追蹤額度</span><span className="toggle"><input type="checkbox" checked={lookup} onChange={e=>setLookup(e.target.checked)}/><i/></span></label>
     {!lookup&&<label className="field"><span>結帳日</span><input type="number" inputMode="numeric" min={1} max={31} value={closeDay} onChange={e=>setCloseDay(e.target.value)}/><span className="unit">日</span></label>}
    </div>
    <p className="form-foot">有上限的優惠會自動變成額度追蹤，可再自行調整。</p>
    <button className="btn btn-primary btn-block" style={{marginTop:12}} disabled={busy||(!lookup&&!(Number(closeDay)>=1&&Number(closeDay)<=31))} onClick={()=>onAdd(entry,Number(closeDay)||15,lookup)}>{busy?'加入中…':'確認加入'}</button>
   </>
   :<button className="btn btn-primary btn-block" style={{marginTop:18}} onClick={()=>setAdding(true)}><CreditCard size={17}/>我有這張，加入卡片</button>}
  <a className="btn btn-gray btn-block" style={{marginTop:9}} href={entry.url} target="_blank" rel="noopener noreferrer">銀行官網<ArrowUpRight size={16}/></a>
  {entry.verified==='official'
   ?<div className="verified ok"><ShieldCheck size={14}/>回饋率已與銀行官網比對</div>
   :<div className="verified"><CalendarCheck size={14}/>第三方整理，尚未逐項比對官網</div>}
  <p className="caption">權益常更動，也可能有排除通路、名額或資格限制，申辦前請以銀行公告為準。</p>
 </>;
}
