'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Check,ChevronDown,MapPin,Trash2} from 'lucide-react';
import {type Campaign,type Entry,type Ledger,range,today,tracksProgress} from '../../lib/ledger';
import {adviseCard,impact,suggestCampaigns} from '../../lib/advise';
import {indexEntriesByCampaign} from '../../lib/entry-index';
import {CardArt} from '../ui/card-art';
import {Meter} from '../ui/meter';
import {Sheet} from '../ui/sheet';
import {money,periodNames,whole} from '../format';

export type Draft={entry?:Entry;cardId?:string;note?:string;amount?:number|null};
type Props={data:Ledger;draft:Draft;notes:string[];busy:boolean;error:string;conflict:boolean;onSync:()=>Promise<void>;onClose:()=>void;onSave:(entry:Entry)=>void;onDelete?:()=>void};

/**
 * Amount, then where, then the card: by the time the card row is reached it is already ranked
 * for this purchase, and the campaigns it counts towards are picked from the merchant.
 */
export function RecordSheet({data,draft,notes,busy,error,conflict,onSync,onClose,onSave,onDelete}:Props){
 const saved=draft.entry,editing=!!saved?.id;
 const cards=useMemo(()=>data.cards.filter(c=>!c.lookupOnly||c.id===saved?.cardId),[data.cards,saved?.cardId]);
 const [amountText,setAmountText]=useState(saved?.amount?String(saved.amount):draft.amount?String(draft.amount):'');
 const [note,setNote]=useState(saved?.note??draft.note??'');
 const [date,setDate]=useState(saved?.date||today());
 const [chosenCard,setChosenCard]=useState<string|null>(saved?.cardId||draft.cardId||null);
 // Null until the person picks by hand: from then on the merchant no longer overrides them.
 const [picked,setPicked]=useState<string[]|null>(editing?saved!.campaignIds:null);
 const [advanced,setAdvanced]=useState(saved?.reward!=null),[rewardText,setRewardText]=useState(saved?.reward!=null?String(saved.reward):'');
 const [showOff,setShowOff]=useState(false);

 const amount=Number(amountText)>0?Number(amountText):null;
 const index=useMemo(()=>indexEntriesByCampaign(data.entries),[data.entries]);
 const ranked=useMemo(()=>{
  const list=cards.map((card,order)=>({card,order,advice:adviseCard(card,data,note,amount,date||today(),index)}));
  if(!note.trim())return list;
  return [...list].sort((a,b)=>(b.advice?.gain??b.advice?.rate??0)-(a.advice?.gain??a.advice?.rate??0)||a.order-b.order);
 },[cards,data,note,amount,date,index]);
 const best=note.trim()&&(ranked[0]?.advice?.specific)?ranked[0].card.id:null;
 const cardId=chosenCard||best||cards[0]?.id||'';
 const card=data.cards.find(c=>c.id===cardId);
 const own=useMemo(()=>data.campaigns.filter(c=>c.cardId===cardId&&tracksProgress(c)),[data.campaigns,cardId]);
 const activeOn=(c:Campaign)=>!!card&&!!date&&range(c,card,date).active;
 const live=own.filter(activeOn),off=own.filter(c=>!activeOn(c));
 const suggestion=useMemo(()=>suggestCampaigns(data,cardId,note,date),[data,cardId,note,date]);
 const chosen=picked?picked.filter(id=>own.some(c=>c.id===id)):suggestion.ids;
 // Campaigns this form cannot show, such as query-only offers, stay attached when editing.
 const kept=editing?saved!.campaignIds.filter(id=>data.campaigns.some(c=>c.id===id&&c.cardId===cardId&&!tracksProgress(c))):[];
 const effects=useMemo(()=>card&&amount?impact(data,card,chosen,amount,date,index,saved?.id||undefined):[],[card,data,chosen,amount,date,index,saved?.id]);
 const effectOf=(id:string)=>effects.find(e=>e.c.id===id);
 const lost=Math.max(0,...effects.map(e=>e.lost));
 const gain=amount?effects.reduce((sum,e)=>sum+(e.c.kind==='reward'?Math.min(amount-e.lost,amount)*e.c.rate/100:0),0):0;
 const valid=!!amount&&!!card&&!!date;
 // Ranking can reorder the row under the chosen card; keep that card in view.
 const picker=useRef<HTMLDivElement>(null),order=ranked.map(item=>item.card.id).join();
 useEffect(()=>{
  const el=picker.current,target=el?.querySelector<HTMLElement>('[aria-checked=true]');
  if(el&&target)el.scrollTo({left:target.offsetLeft-(el.clientWidth-target.offsetWidth)/2,behavior:'smooth'});
 },[cardId,order]);

 function toggle(id:string,on:boolean){setPicked(on?[...chosen,id]:chosen.filter(x=>x!==id));}
 function pickCard(id:string){setChosenCard(id);setPicked(null);}
 function save(){
  if(!valid||busy)return;
  onSave({id:saved?.id||'',cardId,date,amount:amount!,note:note.trim(),campaignIds:[...new Set([...chosen,...kept])],reward:rewardText===''?null:Number(rewardText)});
 }

 return <Sheet title={editing?'編輯消費':'記一筆'} full locked={busy} onClose={onClose}
  left={<button type="button" className="text" disabled={busy} onClick={onClose}>取消</button>}
  right={<button type="button" className="text strong" disabled={busy||!valid} onClick={save}>{busy?'儲存中':'儲存'}</button>}>
  <form onSubmit={e=>{e.preventDefault();save();}}>
   <div className="amount-pad">
    <div className="amount-input"><span>NT$</span><div className="amount-field" style={{'--amount':`${amountText.length>9?32:amountText.length>6?42:52}px`} as React.CSSProperties}><input aria-label="消費金額" className="num" type="number" inputMode="decimal" min="0.01" max="10000000000" step="0.01" data-autofocus={!editing||undefined} placeholder="0" value={amountText} onChange={e=>setAmountText(e.target.value)}/></div></div>
   </div>
   <label className="where"><MapPin size={17}/><input aria-label="在哪裡刷" maxLength={500} enterKeyHint="done" value={note} onChange={e=>{setNote(e.target.value);if(!editing)setPicked(null);}} placeholder="在哪裡刷？蝦皮、全聯…"/></label>
   {notes.length>0&&<div className="chips" role="group" aria-label="常用通路">{notes.map(n=><button type="button" key={n} className="chip" aria-pressed={note===n} onClick={()=>{setNote(note===n?'':n);if(!editing)setPicked(null);}}>{n}</button>)}</div>}

   <div className="form-label"><span>{best?'依這筆排序':'刷哪張'}</span></div>
   <div className="picker" ref={picker} role="radiogroup" aria-label="信用卡">{ranked.map(({card:c,advice})=>{
    const est=amount&&advice?.gain!=null?`+${money(advice.gain)}`:advice&&advice.rate>0?`${advice.rate}%`:'—';
    return <button type="button" role="radio" key={c.id} className="pick" aria-checked={cardId===c.id} onClick={()=>pickCard(c.id)}>
     <CardArt card={c}/>
     {best===c.id&&<span className="top">最佳</span>}
     <b className="name">{c.name}</b><span className={`est${advice?.specific?' good':''}`}>{est}</span>
    </button>;
   })}</div>
   {!data.cards.some(c=>c.id===cardId)&&<p className="inline-error">原卡片已刪除，請重新選擇。</p>}

   {amount&&card&&<div className={`hint${lost>0?' warn':gain>0?' good':''}`} style={{marginTop:10}}>
    <span className="num">{lost>0?`這筆有 NT$ ${whole(lost)} 超過上限，拿不到回饋`:gain>0?`預估回饋 NT$ ${money(Math.round(gain*100)/100)}`:'這筆沒有計入回饋活動'}</span>
   </div>}

   <div className="form-label"><span>計入活動 · {chosen.length}{suggestion.matched&&!picked?' · 依通路自動選':''}</span>{own.length>0&&<button type="button" className="link" style={{fontSize:13}} onClick={()=>setPicked(chosen.length?[]:live.map(c=>c.id))}>{chosen.length?'全部取消':'選當期'}</button>}</div>
   {own.length?<div className="form-group">
    {live.map(c=><Activity key={c.id} c={c} checked={chosen.includes(c.id)} effect={effectOf(c.id)} onChange={v=>toggle(c.id,v)}/>)}
    {off.length>0&&<button type="button" className="disclosure" aria-expanded={showOff} onClick={()=>setShowOff(v=>!v)}>{showOff?'收起':'顯示'}不在此日期的活動 {off.length}<ChevronDown size={14}/></button>}
    {showOff&&off.map(c=><Activity key={c.id} c={c} warn checked={chosen.includes(c.id)} effect={effectOf(c.id)} onChange={v=>toggle(c.id,v)}/>)}
   </div>:<p className="form-foot">這張卡沒有追蹤中的活動，仍可先儲存消費。</p>}
   {!!note.trim()&&!suggestion.matched&&own.length>0&&!picked&&<p className="form-foot">沒有辨識出這個通路，先勾選全部當期活動，可自行調整。</p>}

   <div className="form-group" style={{marginTop:14}}>
    <label className="field"><span>日期</span><input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label>
   </div>
   <button type="button" className="disclosure" aria-expanded={advanced} style={{marginTop:6}} onClick={()=>setAdvanced(v=>!v)}>實際回饋（選填）<ChevronDown size={14}/></button>
   {advanced&&<><div className="form-group"><label className="field"><span>實際回饋</span><input type="number" inputMode="decimal" min="0" max="10000000000" step="0.01" value={rewardText} onChange={e=>setRewardText(e.target.value)} placeholder="依回饋率估算"/><span className="unit">NT$</span></label></div>
   <p className="form-foot">{effects.filter(e=>e.c.kind==='reward').length>1?`同一金額會分別計入已勾選的 ${effects.filter(e=>e.c.kind==='reward').length} 個回饋活動；各活動回饋不同時請留空。`:'留空則依活動回饋率估算；滿額活動不使用此欄位。'}</p></>}

   {error&&<div role="alert" className="inline-error">{error}{conflict&&<button type="button" disabled={busy} onClick={()=>void onSync()}>同步最新帳簿（表單會保留）</button>}</div>}
   {editing&&onDelete&&<button type="button" className="btn btn-danger btn-block" style={{marginTop:22}} disabled={busy} onClick={onDelete}><Trash2 size={17}/>刪除消費</button>}
  </form>
 </Sheet>;
}

function Activity({c,checked,onChange,warn,effect}:{c:Campaign;checked:boolean;onChange:(v:boolean)=>void;warn?:boolean;effect?:ReturnType<typeof impact>[number]}){
 const line=c.kind==='reward'?`${c.rate}% · 上限 ${money(c.target)}`:`滿額 ${money(c.target)}`;
 const left=effect&&effect.spendLeft!==null?(effect.spendLeft<=0?(c.kind==='reward'?'這筆後已滿':'這筆後達標'):`這筆後${c.kind==='reward'?'還能刷':'還差'} ${whole(effect.spendLeft)}`):'';
 return <label className="check-cell"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span className="box"><Check size={14} strokeWidth={3}/></span>
  <span className="cell-main">
   <span className="cell-title">{c.name}</span>
   <span className="cell-sub">{left||line} · {periodNames[c.period]}{warn&&<span style={{color:'var(--near)'}}> · 不在活動期間</span>}</span>
   {effect&&<div className="preview"><Meter value={effect.before} after={effect.after} goal={c.kind==='spend'}/></div>}
  </span></label>;
}

/** Most recent distinct notes power the one-tap shortcuts. */
export function recentNotes(entries:Entry[]){
 return [...new Set(entries.map((e,i)=>({e,i})).sort((a,b)=>b.e.date.localeCompare(a.e.date)||b.i-a.i).map(x=>x.e.note.trim()).filter(Boolean))].slice(0,8);
}
