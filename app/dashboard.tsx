'use client';
import {useEffect,useState,type FormEvent} from 'react';
import dynamic from 'next/dynamic';
import {Gauge,Tag,ArrowLeftRight,WalletCards,Plus,Check,RefreshCw,AlertCircle} from 'lucide-react';
import {useLedger} from './use-ledger';
import type {Modal} from './editor-types';
import {type Card,type Campaign,type Entry,type Ledger,today,removeCampaign} from '../lib/ledger';
import {safeImageUrl} from '../lib/card-images';
import {parseChannels} from '../lib/channels';
import {registrationFromFields,safeRegistrationUrl} from '../lib/registration';
import type {Offer,Row} from '../lib/insights';
import {LimitsView} from './views/limits';
import {OffersView} from './views/offers';
import {WalletView} from './views/wallet';
import {Sheet} from './sheet';
import {CampaignDetail,CardDetail,OfferDetail} from './details';
const RatesView=dynamic(()=>import('./views/rates').then(m=>m.RatesView),{ssr:false,loading:()=><div className="skeleton" style={{height:320}}/>});
const Editor=dynamic(()=>import('./editor'),{ssr:false});

type Tab='limits'|'offers'|'rates'|'wallet';
type Detail={kind:'campaign';row:Row}|{kind:'offer';offer:Offer;query:string}|{kind:'card';card:Card};
const tabs:[Tab,string,typeof Gauge][]=[['limits','額度',Gauge],['offers','優惠',Tag],['rates','匯率',ArrowLeftRight],['wallet','錢包',WalletCards]];
const titles:Record<Tab,[string,string]>={limits:['額度','這個週期還能刷多少'],offers:['優惠','這家店，該刷哪張卡'],rates:['匯率','海外刷卡，先算台幣'],wallet:['錢包','卡片、優惠與消費紀錄']};
const upsert=<T extends {id:string}>(items:T[],item:T)=>items.some(x=>x.id===item.id)?items.map(x=>x.id===item.id?item:x):[...items,item];
const blankEntry=(cardId:string):Entry=>({id:'',cardId,date:today(),amount:0,note:'',campaignIds:[],reward:null});

export default function Dashboard(){
 const [tab,setTab]=useState<Tab>('limits'),[walletTab,setWalletTab]=useState<'cards'|'entries'>('cards');
 const [modal,setModal]=useState<Modal|null>(null),[detail,setDetail]=useState<Detail|null>(null);
 const [now,setNow]=useState(today),[on,setOn]=useState(today),[scrolled,setScrolled]=useState(false);
 const {data,loading,saving,syncing,ready,cached,error,setError,conflict,setConflict,updated,notice,load,cancelRead,save}=useLedger(!!modal);

 useEffect(()=>{
  const onScroll=()=>setScrolled(window.scrollY>24);
  const wake=()=>{const d=today();setNow(prev=>{if(prev!==d)setOn(d);return d;});};
  onScroll();window.addEventListener('scroll',onScroll,{passive:true});document.addEventListener('visibilitychange',wake);
  return()=>{window.removeEventListener('scroll',onScroll);document.removeEventListener('visibilitychange',wake);};
 },[]);
 useEffect(()=>{if(!ready)return;const t=setTimeout(()=>{void import('./editor').catch(()=>{});},1200);return()=>clearTimeout(t);},[ready]);

 function go(next:Tab){if(next===tab)window.scrollTo({top:0,behavior:'smooth'});else{setTab(next);window.scrollTo({top:0});}}
 function edit(value:Modal){if(!cancelRead())return;setError('');setConflict(false);setDetail(null);setModal(value);}
 const defaultCard=()=>data.cards.find(c=>!c.lookupOnly)?.id||data.cards[0]?.id||'';
 function addEntry(cardId?:string){
  if(!data.cards.length){edit({type:'card'});return;}
  edit({type:'entry',value:blankEntry(cardId||defaultCard()),isNew:true});
 }
 const openEntry=(e?:Entry)=>e?edit({type:'entry',value:e}):addEntry();
 function shift(n:number){const d=new Date(on+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+n,1);const v=d.toISOString().slice(0,10);setOn(v.slice(0,7)===now.slice(0,7)?now:v);}

 async function remove(type:Modal['type'],id:string){
  if(saving)return false;
  const message=type==='card'?'刪除這張卡片，以及它的所有活動與消費紀錄？':type==='campaign'?'刪除此活動？消費紀錄會保留。':'刪除這筆消費？';
  if(!confirm(message))return false;
  let next:Ledger=data;
  if(type==='card')next={cards:data.cards.filter(c=>c.id!==id),campaigns:data.campaigns.filter(c=>c.cardId!==id),entries:data.entries.filter(e=>e.cardId!==id)};
  if(type==='campaign')next=removeCampaign(data,id);
  if(type==='entry')next={...data,entries:data.entries.filter(e=>e.id!==id)};
  return save(next);
 }

 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!modal||saving)return;
  const existing=modal.value?.id&&!modal.isNew;
  if(existing){const items:{id:string}[]=modal.type==='card'?data.cards:modal.type==='campaign'?data.campaigns:data.entries;if(!items.some(x=>x.id===modal.value!.id)){setError('這筆資料已被其他裝置刪除。請取消後重新建立，避免還原已刪除的資料。');return;}}
  const f=new FormData(event.currentTarget),val=(k:string)=>String(f.get(k)??''),id=existing?modal.value!.id:crypto.randomUUID();
  if(modal.type!=='card'&&!data.cards.some(c=>c.id===val('cardId'))){setError('請選擇信用卡。');return;}
  let next=data;
  if(modal.type==='card'){
   const mode=val('imageMode');
   const c:Card={id,name:val('name').trim(),bank:val('bank').trim(),closeDay:Number(val('closeDay'))||15,color:val('color'),lookupOnly:val('lookupOnly')==='yes',imageZoom:Number(val('imageZoom'))||1,...(mode==='auto'?{}:{imageUrl:mode==='none'?'':val('imageUrl').trim()})};
   if(c.imageUrl&&!safeImageUrl(c.imageUrl)){setError('請上傳卡面圖片，或填入 HTTPS 圖片網址。');return;}
   next={...data,cards:upsert(data.cards,c)};
  }
  if(modal.type==='campaign'){
   const c:Campaign={id,cardId:val('cardId'),name:val('name').trim(),kind:val('kind') as Campaign['kind'],period:val('period') as Campaign['period'],target:Number(val('target')),rate:Number(val('rate')),rateLabel:val('rateLabel').trim(),queryOnly:val('queryOnly')==='yes',start:val('start'),end:val('end'),notes:val('notes'),channels:parseChannels(val('channels')),registration:registrationFromFields(val('registrationType'),val('registrationLabel'),val('registrationDetails'),val('registrationUrl'))};
   if(c.registration?.url&&!safeRegistrationUrl(c.registration.url)){setError('請填入 HTTPS 官方說明或登錄網址。');return;}
   if((c.start&&c.end&&c.start>c.end)||(c.kind!=='unlimited'&&c.period==='custom'&&(!c.start||!c.end))){setError('請填入有效的起訖日期。');return;}
   next={...data,campaigns:upsert(data.campaigns,c)};
  }
  if(modal.type==='entry'){
   const e:Entry={id,cardId:val('cardId'),date:val('date'),amount:Number(val('amount')),note:val('note').trim(),campaignIds:[...new Set(f.getAll('campaignIds').map(String))],reward:val('reward')===''?null:Number(val('reward'))};
   next={...data,entries:upsert(data.entries,e)};
   // Entries save optimistically; the form comes back with its content if the cloud refuses.
   const draft:Modal={type:'entry',value:e,isNew:!existing};
   setModal(null);
   if(!await save(next,true))setModal(draft);
   return;
  }
  if(await save(next))setModal(null);
 }

 const [title,subtitle]=titles[tab];
 const syncState=saving?'儲存中':loading?'讀取中':syncing?(cached?'更新中':'同步中'):error?'未同步':updated?new Date(updated).toLocaleTimeString('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hour12:false}):'已連線';

 return <>
  <div className="ambient" aria-hidden="true"/>
  <div className="app">
   <header className={`navbar${scrolled?' scrolled':''}`}>
    <img src="/brand-icon-graphite-v2.png" alt="CARDI" width={30} height={30} style={{borderRadius:9}}/>
    <span className="mini-title" aria-hidden="true">{title}</span>
    <button className={`sync${saving||loading||syncing?' busy':error?' bad':''}`} disabled={saving||loading||syncing} onClick={()=>void load()} aria-label={`雲端同步：${syncState}，點一下重新整理`}><i/>{syncState}</button>
   </header>
   <div className="large-title"><h1>{title}</h1><p>{subtitle}</p></div>
   {error&&!modal&&tab!=='rates'&&<div className="banner" role="alert"><AlertCircle size={18} style={{marginTop:1}}/><div>{error}<button onClick={()=>void load()}>重新讀取</button></div></div>}
   <main>
    {tab==='limits'&&<LimitsView data={data} on={on} today={now} loading={loading} onShift={shift} onToday={()=>setOn(now)} onOpen={row=>setDetail({kind:'campaign',row})} onCard={card=>setDetail({kind:'card',card})} onEntry={openEntry} onAddCampaign={()=>edit({type:'campaign'})} onAddCard={()=>edit({type:'card'})} onAllEntries={()=>{setWalletTab('entries');go('wallet');}}/>}
    {tab==='offers'&&<OffersView data={data} today={now} onOpen={(offer,query)=>setDetail({kind:'offer',offer,query:query||''})} onAddCampaign={()=>edit({type:'campaign'})}/>}
    {tab==='rates'&&<RatesView/>}
    {tab==='wallet'&&<WalletView data={data} today={now} tab={walletTab} onTab={setWalletTab} onCard={card=>setDetail({kind:'card',card})} onAddCard={()=>edit({type:'card'})} onEntry={openEntry}/>}
   </main>
  </div>

  <nav className="dock" aria-label="主要功能">
   <div className="tabs">{tabs.map(([key,label,Icon])=><button key={key} aria-current={tab===key?'page':undefined} onClick={()=>go(key)}><Icon size={22} strokeWidth={tab===key?2.2:1.8}/>{label}</button>)}</div>
   <button className="fab" aria-label="記一筆消費" disabled={!ready} onClick={()=>addEntry()}><Plus size={28} strokeWidth={2.6}/></button>
  </nav>

  {detail&&<Sheet title={detail.kind==='campaign'?'活動進度':detail.kind==='offer'?'優惠':'卡片'} onClose={()=>setDetail(null)}>
   {detail.kind==='campaign'&&<CampaignDetail row={detail.row} data={data} onEntry={()=>addEntry(detail.row.card.id)} onEdit={()=>edit({type:'campaign',value:detail.row.c})} onEditEntry={e=>edit({type:'entry',value:e})}/>}
   {detail.kind==='offer'&&<OfferDetail offer={detail.offer} query={detail.query} onEntry={()=>addEntry(detail.offer.card.id)} onEdit={()=>edit({type:'campaign',value:detail.offer.c})}/>}
   {detail.kind==='card'&&<CardDetail card={data.cards.find(c=>c.id===detail.card.id)||detail.card} data={data} today={now} onEntry={()=>addEntry(detail.card.id)} onEdit={()=>edit({type:'card',value:detail.card})} onAddCampaign={()=>edit({type:'campaign',cardId:detail.card.id})} onEditCampaign={c=>edit({type:'campaign',value:c})} onEditEntry={e=>edit({type:'entry',value:e})}/>}
  </Sheet>}
  {modal&&<Editor modal={modal} cards={data.cards} campaigns={data.campaigns} busy={saving} error={error} conflict={conflict} onSync={load}
   onClose={()=>{if(!saving){setModal(null);setError('');}}} onSubmit={submit}
   onDelete={modal.value?.id&&!modal.isNew?async()=>{if(await remove(modal.type,modal.value!.id))setModal(null);}:undefined}/>}
  {(saving||notice)&&<div className="toast" role="status">{saving?<RefreshCw size={15} className="spin"/>:<Check size={15} strokeWidth={3}/>}{saving?'正在同步…':notice}</div>}
 </>;
}
