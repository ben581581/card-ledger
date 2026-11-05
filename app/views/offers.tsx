'use client';
import {useDeferredValue,useMemo,useState} from 'react';
import {CalendarCheck,CalendarClock,ChevronDown,ChevronRight,Search,Sparkles,Tag,X} from 'lucide-react';
import {type Campaign,type Card,type Ledger,addDays,range} from '../../lib/ledger';
import {featuredChannels,normalizeChannel} from '../../lib/channels';
import {type Advice,advise} from '../../lib/advise';
import {type Catalog,betterAtMerchant} from '../../lib/catalog';
import {offerActive} from '../../lib/insights';
import {indexEntriesByCampaign} from '../../lib/entry-index';
import {CardArt,CatalogFace} from '../ui/card-art';
import {Meter} from '../ui/meter';
import {money,rate as rateNumber,shortDate,shortRate,whole} from '../format';

type Props={data:Ledger;today:string;catalog:Catalog|null;onOffer:(campaignId:string,query:string)=>void;onCard:(id:string)=>void;onCatalog:(id:string)=>void;onRecord:(cardId:string,note:string,amount:number|null)=>void;onAddCampaign:()=>void};

function adviceLine(a:Advice){
 const lead=a.parts.find(p=>!p.full)||a.parts[0];
 const name=lead?lead.c.name:a.extras[0]?.name||'';
 if(!a.parts.length)return `${name} · 需符合條件`;
 if(a.parts.every(p=>p.full))return `${name} · 本期已用滿`;
 return a.room!==null?`${name} · 還能刷 ${whole(a.room)}`:name;
}
const rateLabel=(a:Advice)=>a.label&&!a.parts.some(p=>p.full)&&a.parts.length===1?a.label:`${rateNumber(a.rate)}%`;

export function OffersView({data,today,catalog,onOffer,onCard,onCatalog,onRecord,onAddCampaign}:Props){
 const [query,setQuery]=useState(''),[amountText,setAmountText]=useState('');
 const deferred=useDeferredValue(query.trim());
 const amount=Number(amountText.replaceAll(',',''))>0?Number(amountText.replaceAll(',','')):null;
 const index=useMemo(()=>indexEntriesByCampaign(data.entries),[data.entries]);
 const featured=useMemo(()=>featuredChannels(data,today),[data,today]);
 const results=useMemo(()=>deferred?advise(data,deferred,amount,today,index):[],[data,deferred,amount,today,index]);
 const better=useMemo(()=>catalog?betterAtMerchant(catalog.cards,data.cards,deferred,results[0]?.rate??0,today):[],[catalog,data.cards,deferred,results,today]);
 const [best,...rest]=results;
 const dead=!!best&&best.rate<=0;

 return <div className="view">
  <div className="search"><Search size={18}/>
   <input type="search" enterKeyHint="search" aria-label="搜尋通路" placeholder="在哪裡刷？" value={query} maxLength={80} onChange={e=>setQuery(e.target.value)}/>
   {query&&<button className="clear" aria-label="清除" onClick={()=>setQuery('')}><X size={12} strokeWidth={3}/></button>}
   <label className="search-amount">NT$<input inputMode="numeric" aria-label="消費金額（選填）" placeholder="金額" value={amountText} onChange={e=>setAmountText(e.target.value.replace(/[^\d.]/g,''))}/></label>
  </div>
  {!!featured.length&&<div className="chips" role="group" aria-label="熱門通路">{featured.map(({channel,cardCount})=>{const on=normalizeChannel(query)===normalizeChannel(channel);return <button key={channel} className="chip" aria-pressed={on} onClick={()=>setQuery(on?'':channel)}>{channel}<em>{cardCount} 張</em></button>;})}</div>}

  {deferred?<>
   {best?<button className={`best${dead?' dead':''}`} onClick={()=>{const c=best.parts[0]?.c||best.extras[0];if(c)onOffer(c.id,deferred);}}>
    <span className="best-label">{dead?'額度都用完了':'刷這張最划算'}</span>
    <div className="best-main">
     <CardArt card={best.card}/>
     <div style={{minWidth:0}}><h3>{best.card.name}</h3><p>{best.card.bank||'信用卡'}</p></div>
     <div className="best-rate num">{rateLabel(best).replace('%','')}{!rateLabel(best).includes('–')&&!rateLabel(best).includes('～')&&<small>%</small>}</div>
    </div>
    <div className="best-foot"><span>{adviceLine(best)}</span>{best.gain!==null&&best.gain>0&&<span className="gain">· 預估回饋 NT$ {money(best.gain)}</span>}</div>
   </button>:<p className="caption" style={{marginTop:16}}>手上的卡在這裡沒有符合的優惠，也沒有一般回饋活動。{data.campaigns.some(c=>c.channels?.length)?'換個通路名稱試試。':'先在卡片的優惠活動中填入適用通路。'}</p>}
   {best&&!best.card.lookupOnly&&<button className="pill" style={{marginTop:10}} onClick={()=>onRecord(best.card.id,deferred,amount)}>用這張記一筆</button>}

   {rest.length>0&&<>
    <div className="section-head"><h2>其他卡片</h2><span className="num">{rest.length}</span></div>
    <div className="group">{rest.map(a=><AdviceCell key={a.card.id} advice={a} onOpen={()=>{const c=a.parts[0]?.c||a.extras[0];if(c)onOffer(c.id,deferred);}}/>)}</div>
   </>}
   {results.length>1&&<p className="caption">依「這筆實際能拿到的回饋」排序：同卡加碼會相加，切換型方案取最高，已用滿的上限不計。有條件的優惠不列入，以銀行公告為準。</p>}

   {better.length>0&&<>
    <div className="section-head"><h2>還沒有的卡，這裡更高</h2></div>
    <div className="group">{better.map(({entry,rate})=><button key={entry.id} className="card-tile" onClick={()=>onCatalog(entry.id)}>
     <CatalogFace entry={entry}/>
     <div className="card-tile-main"><h3><span>{entry.name}</span></h3><p>{entry.bank} · 年費 {entry.fee?`NT$ ${whole(entry.fee)}`:'免'}</p></div>
     <span className="rate num">{rateNumber(rate)}%</span>
    </button>)}</div>
   </>}
  </>:<Browse data={data} today={today} onOffer={onOffer} onCard={onCard} onAdd={onAddCampaign}/>}
 </div>;
}

function AdviceCell({advice:a,onOpen}:{advice:Advice;onOpen:()=>void}){
 const spent=a.parts.length>0&&a.parts.every(p=>p.full);
 const tight=a.parts.find(p=>p.room!==null&&p.specific);
 return <button className="cell" style={{opacity:spent?.55:1}} onClick={onOpen}>
  <CardArt card={a.card} compact/>
  <div className="cell-main"><span className="cell-title">{a.card.name}</span><span className="cell-sub clip">{adviceLine(a)}</span>
   {tight&&!spent&&tight.c.target>0&&<div className="preview mini-meter"><Meter value={100-(tight.room!*tight.rate/100)/tight.c.target*100}/></div>}</div>
  <div className="cell-end">{rateLabel(a)}{a.gain!==null&&<small>NT$ {money(a.gain)}</small>}</div>
 </button>;
}

function Browse({data,today,onOffer,onCard,onAdd}:{data:Ledger;today:string;onOffer:(id:string,query:string)=>void;onCard:(id:string)=>void;onAdd:()=>void}){
 const [allTasks,setAllTasks]=useState(false);
 const cards=useMemo(()=>new Map(data.cards.map(c=>[c.id,c])),[data.cards]);
 const live=useMemo(()=>data.campaigns.filter(c=>{const card=cards.get(c.cardId);return !!card&&range(c,card,today).active;}),[data.campaigns,cards,today]);
 const ending=useMemo(()=>{
  const limit=addDays(today,30);
  return live.filter(c=>c.end&&c.end<=limit).sort((a,b)=>a.end.localeCompare(b.end));
 },[live,today]);
 const tasks=useMemo(()=>live.filter(c=>c.registration?.type==='required'&&!c.queryOnly),[live]);
 const grouped=useMemo(()=>data.cards.map(card=>({card,offers:data.campaigns.filter(c=>c.cardId===card.id)})).filter(g=>g.offers.length),[data]);
 if(!grouped.length)return <div className="empty" style={{marginTop:20}}><div className="empty-icon"><Tag size={24}/></div><h3>還沒有優惠資料</h3><p>為卡片新增優惠活動並填入通路，就能用通路名稱一次比較所有卡。</p><button className="btn btn-primary" onClick={onAdd}>新增優惠</button></div>;
 const shownTasks=allTasks?tasks:tasks.slice(0,3);
 return <>
  {tasks.length>0&&<>
   <div className="section-head"><h2 className="tone near">需要登錄才有回饋</h2><span className="num">{tasks.length}</span></div>
   <div className="group">{shownTasks.map(c=><Line key={c.id} c={c} card={cards.get(c.cardId)!} icon={<CalendarCheck size={18} style={{color:'var(--near)'}}/>} sub={c.registration?.label||''} onOpen={()=>onOffer(c.id,'')}/>)}</div>
   {tasks.length>3&&<button className="disclosure" aria-expanded={allTasks} onClick={()=>setAllTasks(v=>!v)}>{allTasks?'收起':`全部 ${tasks.length} 項`}<ChevronDown size={15}/></button>}
  </>}
  {ending.length>0&&<>
   <div className="section-head"><h2>30 天內到期</h2><span className="num">{ending.length}</span></div>
   <div className="group">{ending.slice(0,5).map(c=><Line key={c.id} c={c} card={cards.get(c.cardId)!} icon={<CalendarClock size={18} style={{color:'var(--t2)'}}/>} sub={`${shortDate(c.end)} 結束`} onOpen={()=>onOffer(c.id,'')}/>)}</div>
  </>}
  <div className="section-head"><h2>我的卡片</h2><span className="num">{data.cards.length} 張</span></div>
  <div className="group">{grouped.map(({card,offers})=>{
   const active=offers.filter(c=>offerActive(c,card,today));
   const top=Math.max(0,...active.filter(c=>c.kind!=='spend').map(c=>c.rate));
   return <button key={card.id} className="cell" onClick={()=>onCard(card.id)}>
    <CardArt card={card} compact/>
    <div className="cell-main"><span className="cell-title">{card.name}</span><span className="cell-sub">{active.length} 項當期優惠{top>0&&` · 最高 ${top}%`}</span></div>
    <ChevronRight size={16} className="chev"/>
   </button>;
  })}</div>
  <p className="caption" style={{display:'flex',gap:6}}><Sparkles size={13} style={{marginTop:2}}/>輸入通路會直接比較所有卡；加上金額，會算出這筆實際能拿多少。</p>
 </>;
}

function Line({c,card,icon,sub,onOpen}:{c:Campaign;card:Card;icon:React.ReactNode;sub:string;onOpen:()=>void}){
 return <button className="cell" onClick={onOpen}>
  {icon}
  <div className="cell-main"><span className="cell-title">{c.name}</span><span className="cell-sub clip">{card.name} · {sub}</span></div>
  <span className={`rate num${c.kind==='spend'?' dim':''}`}>{shortRate(c)}</span>
 </button>;
}
