'use client';
import {useMemo,useState} from 'react';
import {Plus,Pencil,Trash2,Receipt} from 'lucide-react';
import type {Ledger} from '../lib/ledger';
import type {Modal} from './editor-types';

const formatter=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:2});
const pageSize=50;
type Props={
 data:Ledger;
 selected:string;
 saving:boolean;
 onSelect:(id:string)=>void;
 onEdit:(modal:Modal)=>void;
 onDelete:(id:string)=>void;
};

export default function EntriesView({data,selected,saving,onSelect,onEdit,onDelete}:Props){
 const [limit,setLimit]=useState(pageSize);
 // New records are appended, so reverse first to keep same-day additions visible.
 const entries=useMemo(()=>data.entries.filter(entry=>selected==='all'||entry.cardId===selected).reverse().sort((a,b)=>b.date.localeCompare(a.date)),[data.entries,selected]);
 const cards=useMemo(()=>new Map(data.cards.map(card=>[card.id,card])),[data.cards]);
 const campaigns=useMemo(()=>new Map(data.campaigns.map(offer=>[offer.id,offer])),[data.campaigns]);

 return <>
  <div className="filters">
   <select aria-label="消費卡片篩選" value={selected} onChange={event=>{setLimit(pageSize);onSelect(event.target.value);}}>
    <option value="all">所有卡片</option>
    {data.cards.map(card=><option key={card.id} value={card.id}>{card.name}</option>)}
   </select>
   <span>共 {entries.length} 筆</span>
  </div>
  <div className="entries">
   {entries.slice(0,limit).map(entry=><article className="entry" key={entry.id}>
    <div className="entry-icon"><Receipt size={20}/></div>
    <div>
     <h3>{entry.note||'消費紀錄'}</h3>
     <p>{entry.date} · {cards.get(entry.cardId)?.name}</p>
     <small>
      {entry.campaignIds.map(id=>campaigns.get(id)?.name).filter(Boolean).join('、')||'未計入活動'}
      {entry.reward!==null&&` · 實際回饋 NT$ ${formatter.format(entry.reward)}`}
     </small>
    </div>
    <strong>NT$ {formatter.format(entry.amount)}</strong>
    <div className="actions">
     <button aria-label="編輯消費" onClick={()=>onEdit({type:'entry',value:entry})}><Pencil size={16}/></button>
     <button aria-label="刪除消費" disabled={saving} onClick={()=>onDelete(entry.id)}><Trash2 size={16}/></button>
    </div>
   </article>)}
   {!entries.length&&<div className="empty">
    <Receipt size={36}/><h2>{selected==='all'?'尚未記錄消費':'這張卡尚無消費紀錄'}</h2>
    <p>新增一筆消費，活動進度就會自動更新。</p>
    <button className="primary" disabled={!data.cards.length||saving} onClick={()=>onEdit({type:'entry',cardId:selected==='all'?undefined:selected})}><Plus size={16}/>記錄消費</button>
   </div>}
  </div>
  {entries.length>limit&&<div className="entry-pagination">
   <span>已顯示 {limit} / {entries.length} 筆</span>
   <button className="outline" onClick={()=>setLimit(value=>value+pageSize)}>顯示更多消費</button>
  </div>}
 </>;
}
