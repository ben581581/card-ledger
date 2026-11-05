'use client';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import dynamic from 'next/dynamic';
import {AlertCircle,ArrowLeftRight,Check,ChevronLeft,ChevronRight,Gauge,Layers,Plus,RefreshCw,Tag} from 'lucide-react';
import {useLedger} from './use-ledger';
import type {Modal} from './editor-types';
import {type Campaign,type Card,type Entry,type Ledger,today,removeCampaign} from '../lib/ledger';
import {safeImageUrl} from '../lib/card-images';
import {parseChannels} from '../lib/channels';
import {registrationFromFields,safeRegistrationUrl} from '../lib/registration';
import {trackedRows} from '../lib/insights';
import {type Catalog,type CatalogCard,catalogToLedger} from '../lib/catalog';
import {ALL,HomeView} from './views/home';
import {OffersView} from './views/offers';
import {Sheet} from './ui/sheet';
import {haptic} from './ui/haptic';
import {CampaignDetail,CardDetail,History,OfferDetail} from './sheets/details';
import {type Draft,RecordSheet,recentNotes} from './sheets/record';
import {money} from './format';

const RatesView=dynamic(()=>import('./views/rates').then(m=>m.RatesView),{ssr:false,loading:()=><div className="skeleton" style={{height:320}}/>});
const ExploreView=dynamic(()=>import('./views/explore').then(m=>m.ExploreView),{ssr:false,loading:()=><div className="skeleton" style={{height:360}}/>});
const CatalogDetail=dynamic(()=>import('./sheets/catalog').then(m=>m.CatalogDetail),{ssr:false});
const Editor=dynamic(()=>import('./editor'),{ssr:false});

type Tab='home'|'offers'|'explore'|'rates';
type Detail={kind:'campaign';id:string}|{kind:'offer';id:string;query:string}|{kind:'card';id:string}|{kind:'catalog';id:string}|{kind:'history'};
type Toast={text:string;undo?:()=>void};
const tabs:[Tab,string,typeof Gauge][]=[['home','額度',Gauge],['offers','優惠',Tag],['explore','卡庫',Layers],['rates','匯率',ArrowLeftRight]];
const detailTitle={campaign:'活動進度',offer:'優惠',card:'卡片',catalog:'卡片資訊',history:'消費紀錄'};
const upsert=<T extends {id:string}>(items:T[],item:T)=>items.some(x=>x.id===item.id)?items.map(x=>x.id===item.id?item:x):[...items,item];

export default function App(){
 const [tab,setTab]=useState<Tab>('home'),[seen,setSeen]=useState<Set<Tab>>(()=>new Set<Tab>(['home']));
 const [modal,setModal]=useState<Modal|null>(null),[draft,setDraft]=useState<Draft|null>(null),[detail,setDetail]=useState<Detail|null>(null);
 const [now,setNow]=useState(today),[on,setOn]=useState(today),[selected,setSelected]=useState(ALL);
 const [catalog,setCatalog]=useState<Catalog|null>(null),[toast,setToast]=useState<Toast|null>(null);
 const {data,loading,saving,syncing,ready,error,setError,conflict,setConflict,updated,notice,load,cancelRead,save}=useLedger(!!modal||!!draft);
 const scroll=useRef<Partial<Record<Tab,number>>>({});

 useEffect(()=>{
  const wake=()=>{const d=today();setNow(prev=>{if(prev!==d)setOn(d);return d;});};
  document.addEventListener('visibilitychange',wake);
  return()=>document.removeEventListener('visibilitychange',wake);
 },[]);
 useEffect(()=>{if(!ready)return;const t=setTimeout(()=>{void import('./editor').catch(()=>{});void loadCatalog();},900);return()=>clearTimeout(t);},[ready]);
 useEffect(()=>{if(process.env.NODE_ENV==='production'&&'serviceWorker' in navigator)void navigator.serviceWorker.register('/sw.js').catch(()=>{});},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(null),5000);return()=>clearTimeout(t);},[toast]);

 const loadCatalog=useCallback(async()=>{const module=await import('../lib/catalog-data.json');setCatalog(module.default as Catalog);},[]);

 // Tabs stay mounted once visited, so returning to one is instant and keeps its place.
 function go(next:Tab){
  haptic();
  if(next===tab){window.scrollTo({top:0,behavior:'smooth'});return;}
  scroll.current[tab]=window.scrollY;
  if(next==='explore'||next==='offers')void loadCatalog();
  setSeen(prev=>prev.has(next)?prev:new Set(prev).add(next));setTab(next);
  requestAnimationFrame(()=>window.scrollTo({top:scroll.current[next]??0}));
 }
 function clearEditing(){setError('');setConflict(false);setDetail(null);}
 function edit(value:Modal){if(!cancelRead())return;clearEditing();setModal(value);}
 function record(value:Draft={}){
  if(!data.cards.length){edit({type:'card'});return;}
  if(!cancelRead())return;
  clearEditing();setDraft({...value,cardId:value.cardId??value.entry?.cardId??(selected===ALL?undefined:selected)});
 }
 const openEntry=(entry:Entry)=>record({entry});
 function shift(n:number){const d=new Date(on+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+n,1);const v=d.toISOString().slice(0,10);setOn(v.slice(0,7)===now.slice(0,7)?now:v);}

 async function removeItem(type:Modal['type']|'entry',id:string){
  if(saving)return false;
  const message=type==='card'?'刪除這張卡片，以及它的所有活動與消費紀錄？':type==='campaign'?'刪除此活動？消費紀錄會保留。':'刪除這筆消費？';
  if(!confirm(message))return false;
  let next:Ledger=data;
  if(type==='card')next={cards:data.cards.filter(c=>c.id!==id),campaigns:data.campaigns.filter(c=>c.cardId!==id),entries:data.entries.filter(e=>e.cardId!==id)};
  if(type==='campaign')next=removeCampaign(data,id);
  if(type==='entry')next={...data,entries:data.entries.filter(e=>e.id!==id)};
  const done=await save(next);
  if(done&&type==='card'&&selected===id)setSelected(ALL);
  return done;
 }

 async function saveEntry(value:Entry){
  if(saving)return;
  const existing=!!value.id;
  if(existing&&!data.entries.some(x=>x.id===value.id)){setError('這筆資料已被其他裝置刪除。請取消後重新建立，避免還原已刪除的資料。');return;}
  if(!data.cards.some(c=>c.id===value.cardId)){setError('請選擇信用卡。');return;}
  const entry={...value,id:value.id||crypto.randomUUID()},before=data,next={...data,entries:upsert(data.entries,entry)};
  // Entries save optimistically; the form comes back with its content if the cloud refuses.
  const held=draft;
  setDraft(null);haptic();
  if(!await save(next,true)){setDraft(held?{...held,entry:{...entry,id:value.id}}:{entry});return;}
  const lead=trackedRows(next,entry.date).find(r=>entry.campaignIds.includes(r.c.id)&&r.c.kind==='reward'&&r.p.active);
  const text=lead?`${lead.c.name} ${lead.p.remaining===0?'已滿':`還能刷 ${money(Math.floor(lead.p.spendRemaining??0))}`}`:`已記 NT$ ${money(entry.amount)}`;
  setToast({text,undo:existing?undefined:()=>{setToast(null);void save(before);}});
 }

 async function addFromCatalog(entry:CatalogCard,closeDay:number,lookupOnly:boolean){
  if(saving)return;
  const {card,campaigns}=catalogToLedger(entry,()=>crypto.randomUUID(),closeDay,lookupOnly,now);
  if(await save({...data,cards:[...data.cards,card],campaigns:[...data.campaigns,...campaigns]})){
   setDetail(null);setToast({text:`已加入 ${entry.name}`});
  }
 }

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!modal||saving)return;
  const existing=modal.value?.id&&!modal.isNew;
  if(existing){const items:{id:string}[]=modal.type==='card'?data.cards:data.campaigns;if(!items.some(x=>x.id===modal.value!.id)){setError('這筆資料已被其他裝置刪除。請取消後重新建立，避免還原已刪除的資料。');return;}}
  const f=new FormData(event.currentTarget),val=(k:string)=>String(f.get(k)??''),id=existing?modal.value!.id:crypto.randomUUID();
  if(modal.type!=='card'&&!data.cards.some(c=>c.id===val('cardId'))){setError('請選擇信用卡。');return;}
  let next=data;
  if(modal.type==='card'){
   const mode=val('imageMode'),previous=existing?data.cards.find(c=>c.id===id):undefined;
   const c:Card={id,name:val('name').trim(),bank:val('bank').trim(),closeDay:Number(val('closeDay'))||15,color:val('color'),lookupOnly:val('lookupOnly')==='yes',imageZoom:Number(val('imageZoom'))||1,...(previous?.catalogId?{catalogId:previous.catalogId}:{}),...(mode==='auto'?{}:{imageUrl:mode==='none'?'':val('imageUrl').trim()})};
   if(c.imageUrl&&!safeImageUrl(c.imageUrl)){setError('請上傳卡面圖片，或填入 HTTPS 圖片網址。');return;}
   next={...data,cards:upsert(data.cards,c)};
  }
  if(modal.type==='campaign'){
   const c:Campaign={id,cardId:val('cardId'),name:val('name').trim(),kind:val('kind') as Campaign['kind'],period:val('period') as Campaign['period'],target:Number(val('target')),rate:Number(val('rate')),rateLabel:val('rateLabel').trim(),queryOnly:val('queryOnly')==='yes',start:val('start'),end:val('end'),notes:val('notes'),channels:parseChannels(val('channels')),registration:registrationFromFields(val('registrationType'),val('registrationLabel'),val('registrationDetails'),val('registrationUrl'))};
   if(c.registration?.url&&!safeRegistrationUrl(c.registration.url)){setError('請填入 HTTPS 官方說明或登錄網址。');return;}
   if((c.start&&c.end&&c.start>c.end)||(c.kind!=='unlimited'&&c.period==='custom'&&(!c.start||!c.end))){setError('請填入有效的起訖日期。');return;}
   next={...data,campaigns:upsert(data.campaigns,c)};
  }
  if(await save(next))setModal(null);
 }

 const close=()=>{if(!saving){setModal(null);setDraft(null);setError('');}};
 const syncState=saving?'儲存中':loading?'讀取中':syncing?'同步中':error?'未同步':updated?new Date(updated).toLocaleTimeString('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hour12:false}):'已連線';

 return <>
  <div className="stage">
   <div className="app">
    {tab==='home'&&<header className="topbar">
     <div className="month" role="group" aria-label="查看月份">
      <button aria-label="上個月" onClick={()=>shift(-1)}><ChevronLeft size={18}/></button>
      <button className="month-label" onClick={()=>setOn(now)} aria-label="回到本月">{Number(on.slice(5,7))} 月{on.slice(0,4)!==now.slice(0,4)&&<small>{on.slice(0,4)}</small>}</button>
      <button aria-label="下個月" onClick={()=>shift(1)}><ChevronRight size={18}/></button>
     </div>
     <button className={`sync${saving||loading||syncing?' busy':error?' bad':''}`} disabled={saving||loading||syncing} onClick={()=>void load()} aria-label={`雲端同步：${syncState}，點一下重新整理`}><i/>{syncState}</button>
    </header>}
    {error&&!modal&&!draft&&tab!=='rates'&&<div className="banner" role="alert"><AlertCircle size={18} style={{marginTop:1}}/><div>{error}<button onClick={()=>void load()}>重新讀取</button></div></div>}
    <main>
     <div hidden={tab!=='home'}><HomeView data={data} on={on} today={now} loading={loading} selected={selected} onSelect={setSelected} onOpen={id=>setDetail({kind:'campaign',id})} onCard={id=>setDetail({kind:'card',id})} onEntry={openEntry} onRecord={cardId=>record({cardId})} onAddCampaign={cardId=>edit({type:'campaign',cardId})} onAddCard={()=>edit({type:'card'})} onHistory={()=>setDetail({kind:'history'})}/></div>
     {seen.has('offers')&&<div hidden={tab!=='offers'}><OffersView data={data} today={now} catalog={catalog} onOffer={(id,query)=>setDetail({kind:'offer',id,query})} onCard={id=>setDetail({kind:'card',id})} onCatalog={id=>setDetail({kind:'catalog',id})} onRecord={(cardId,note,amount)=>record({cardId,note,amount})} onAddCampaign={()=>edit({type:'campaign'})}/></div>}
     {seen.has('explore')&&<div hidden={tab!=='explore'}><ExploreView data={data} today={now} catalog={catalog} onCatalog={id=>setDetail({kind:'catalog',id})} onCard={id=>setDetail({kind:'card',id})} onAddCard={()=>edit({type:'card'})}/></div>}
     {seen.has('rates')&&<div hidden={tab!=='rates'}><RatesView data={data} today={now}/></div>}
    </main>
   </div>
  </div>

  <nav className="dock" aria-label="主要功能">
   <div className="tabs" style={{'--at':tabs.findIndex(([key])=>key===tab)} as React.CSSProperties}><i aria-hidden="true"/>{tabs.map(([key,label,Icon])=><button key={key} aria-current={tab===key?'page':undefined} onClick={()=>go(key)}><Icon size={21} strokeWidth={tab===key?2.2:1.8}/>{label}</button>)}</div>
   <button className="fab" aria-label="記一筆消費" disabled={!ready} onClick={()=>{haptic();record();}}><Plus size={26} strokeWidth={2.4}/></button>
  </nav>

  {detail&&<DetailSheet detail={detail} data={data} on={on} now={now} catalog={catalog} busy={saving} onClose={()=>setDetail(null)} onDetail={setDetail} onRecord={record} onEdit={edit} onAddCatalog={addFromCatalog}/>}
  {draft&&<RecordSheet key={draft.entry?.id||'new'} data={data} draft={draft} notes={recentNotes(data.entries)} busy={saving} error={error} conflict={conflict} onSync={load} onClose={close} onSave={value=>void saveEntry(value)} onDelete={draft.entry?.id?async()=>{if(await removeItem('entry',draft.entry!.id))setDraft(null);}:undefined}/>}
  {modal&&<Editor modal={modal} cards={data.cards} campaigns={data.campaigns} busy={saving} error={error} conflict={conflict} onSync={load} onClose={close} onSubmit={submit}
   onDelete={modal.value?.id&&!modal.isNew?async()=>{if(await removeItem(modal.type,modal.value!.id))setModal(null);}:undefined}/>}
  {(toast||saving||notice)&&<div className="toast" role="status" key={toast?.text}>{saving?<RefreshCw size={14} className="spin"/>:<Check size={14} strokeWidth={3} style={{color:'var(--open)'}}/>}<span>{saving?'正在同步…':toast?.text||notice}</span>{toast?.undo&&!saving&&<button onClick={toast.undo}>復原</button>}</div>}
 </>;
}

type DetailProps={detail:Detail;data:Ledger;on:string;now:string;catalog:Catalog|null;busy:boolean;onClose:()=>void;onDetail:(d:Detail)=>void;onRecord:(d?:Draft)=>void;onEdit:(m:Modal)=>void;onAddCatalog:(entry:CatalogCard,closeDay:number,lookupOnly:boolean)=>void};

// Always read from the ledger, so an open sheet follows a sync instead of showing a stale copy.
function DetailSheet({detail,data,on,now,catalog,busy,onClose,onDetail,onRecord,onEdit,onAddCatalog}:DetailProps){
 const editEntry=(entry:Entry)=>onRecord({entry});
 return <Sheet key={detail.kind+('id' in detail?detail.id:'')} title={detailTitle[detail.kind]} full={detail.kind==='history'} onClose={onClose}>
  {detail.kind==='campaign'&&(()=>{
   const row=trackedRows(data,on).find(r=>r.c.id===detail.id);
   return row?<CampaignDetail row={row} data={data} today={on} onEntry={()=>onRecord({cardId:row.card.id})} onEdit={()=>onEdit({type:'campaign',value:row.c})} onEditEntry={editEntry}/>:<p className="caption">這個活動已被刪除。</p>;
  })()}
  {detail.kind==='offer'&&(()=>{
   const c=data.campaigns.find(x=>x.id===detail.id),card=data.cards.find(x=>x.id===c?.cardId);
   return c&&card?<OfferDetail c={c} card={card} data={data} today={now} query={detail.query} onEntry={()=>onRecord({cardId:card.id,note:detail.query})} onEdit={()=>onEdit({type:'campaign',value:c})}/>:<p className="caption">這個優惠已被刪除。</p>;
  })()}
  {detail.kind==='card'&&(()=>{
   const card=data.cards.find(x=>x.id===detail.id);
   return card?<CardDetail card={card} data={data} today={now} onEntry={()=>onRecord({cardId:card.id})} onEdit={()=>onEdit({type:'card',value:card})} onAddCampaign={()=>onEdit({type:'campaign',cardId:card.id})} onOffer={c=>onDetail({kind:'offer',id:c.id,query:''})} onEditEntry={editEntry}/>:<p className="caption">這張卡已被刪除。</p>;
  })()}
  {detail.kind==='catalog'&&(()=>{
   const entry=catalog?.cards.find(x=>x.id===detail.id);
   return entry?<CatalogDetail entry={entry} data={data} today={now} busy={busy} onAdd={onAddCatalog} onOpenHeld={id=>onDetail({kind:'card',id})}/>:<div className="skeleton" style={{height:320}}/>;
  })()}
  {detail.kind==='history'&&<History data={data} onEntry={editEntry} onRecord={()=>onRecord()}/>}
 </Sheet>;
}
