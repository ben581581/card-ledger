'use client';

import {ChevronDown,Pencil,Plus,Trash2} from 'lucide-react';
import type {Card,Campaign,progress} from '../lib/ledger';
import {displayPeriod} from '../lib/display-period';
import {CardArtwork} from './card-artwork';

const formatter=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:2});
const money=(value:number)=>formatter.format(value);
const periods={month:'日曆月',bill:'帳單週期',quarter:'季度',custom:'指定期間'};

type Props={
 campaign:Campaign;
 card:Card;
 value:ReturnType<typeof progress>;
 viewDate:string;
 saving:boolean;
 onEdit:()=>void;
 onDelete:()=>void;
 onEntry:()=>void;
};

export function CampaignProgress({campaign:c,card,value:p,viewDate,saving,onEdit,onDelete,onEntry}:Props){
 const reward=c.kind==='reward';
 const status=!p.active?(viewDate<c.start?'尚未開始':'已結束'):p.remaining===0?(reward?'額度已用滿':'已達標'):'累積中';
 return <article className={`campaign progress-card ${!p.active?'inactive':p.remaining===0?'reached':''}`} aria-label={`${card.name} ${c.name}`} style={{'--accent':card.color} as React.CSSProperties}>
  <div className="progress-card-heading">
   <div className="progress-card-identity">
    <h4 className="progress-card-title">{c.name}</h4>
    <div className="progress-card-meta"><span className="progress-card-bank"><CardArtwork card={card} compact/>{card.name}</span><span>{periods[c.period]}</span><span className={p.active?'progress-card-status':''}>{status}</span></div>
   </div>
   <button className="progress-card-edit" aria-label={`編輯 ${c.name}`} onClick={onEdit}><Pencil size={15}/></button>
  </div>
  <div className="progress-card-metric">
   <span>{reward?'還能刷':'達標還差'}<small>{Math.round(p.percent)}% {reward?'已用':'達成'}</small></span>
   <strong><small>NT$</small>{p.spendRemaining===null?'—':money(p.spendRemaining)}</strong>
  </div>
  <div className="bar" role="progressbar" aria-label={`${c.name} ${reward?'回饋額度已用':'消費達標'}進度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.percent}><div style={{width:p.percent+'%'}}/></div>
  <div className="progress-card-footer">
   <details className="progress-card-details">
    <summary aria-label={`${c.name}：查看活動明細`}>明細與條件<ChevronDown size={13} aria-hidden="true"/></summary>
    <div className="progress-card-detail-body">
     <p className="progress-card-period">{displayPeriod(c,p)}</p>
     <dl><div><dt>{reward?'總共可刷':'消費目標'}</dt><dd>{p.spendLimit===null?'未設定回饋率':`NT$ ${money(p.spendLimit)}`}</dd></div><div><dt>期間已刷</dt><dd>NT$ {money(p.spend)}</dd></div></dl>
     <p>{reward?p.spendLimit===null?'請設定回饋率以換算可刷金額。':`${c.rate}% 回饋 · 上限 NT$ ${money(c.target)}`:'計入此活動的期間消費。'}</p>
     {c.notes&&<p className="progress-card-notes">{c.notes}</p>}
     <button className="progress-card-delete" aria-label={`刪除 ${c.name}`} disabled={saving} onClick={onDelete}><Trash2 size={14}/>刪除活動</button>
    </div>
   </details>
   <button className="progress-card-entry" aria-label={`記錄 ${card.name} ${c.name} 的消費`} disabled={saving} onClick={onEntry}><Plus size={15}/>記消費</button>
  </div>
 </article>;
}
