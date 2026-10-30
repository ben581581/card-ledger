'use client';
import {Plus,Pencil,Trash2,ChevronDown,Infinity as InfinityIcon} from 'lucide-react';
import type {Card,Campaign} from '../lib/ledger';
import type {Modal} from './editor-types';
import {CardArtwork} from './card-artwork';

type Props={
 cards:Card[];
 campaigns:Campaign[];
 saving:boolean;
 ready:boolean;
 onEdit:(modal:Modal)=>void;
 onDelete:(id:string)=>void;
};

export default function CardsView({cards,campaigns,saving,ready,onEdit,onDelete}:Props){
 return <section className="cards-grid">
  {cards.map(card=>{
   const offers=campaigns.filter(offer=>offer.cardId===card.id);
   return <article className="card-item" key={card.id}>
    <div className="card-display">
     <CardArtwork card={card}/>
     <div className="card-caption">
      <span>{card.bank||'我的信用卡'}</span>
      <h2>{card.name}</h2>
      <small className={card.lookupOnly?'lookup-card-label':undefined}>
       {card.lookupOnly?<><InfinityIcon size={14}/>僅查詢優惠通路</>:`每月 ${card.closeDay} 日結帳`}
      </small>
     </div>
    </div>
    <div className="card-meta">
     <span>{offers.length} 個優惠</span>
     <button onClick={()=>onEdit({type:'card',value:card})}><Pencil size={15}/>編輯卡片</button>
     <button disabled={saving} onClick={()=>onDelete(card.id)}><Trash2 size={15}/>刪除</button>
    </div>
    <details className="card-offers">
     <summary>優惠通路與活動<ChevronDown size={15} aria-hidden="true"/></summary>
     <div className="card-offers-heading">
      <h3>優惠通路與活動</h3>
      <button disabled={saving} onClick={()=>onEdit({type:'campaign',cardId:card.id})}><Plus size={15}/>新增優惠</button>
     </div>
     {offers.map(offer=><button key={offer.id} className="card-offer-row" onClick={()=>onEdit({type:'campaign',value:offer})}>
      <span>
       <strong>{offer.name}</strong>
       <small>
        {(card.lookupOnly||offer.queryOnly)&&`${offer.kind==='spend'?'消費滿額活動':offer.rateLabel?.trim()||`${offer.rate}% 回饋`} · `}
        {offer.channels?.length?offer.channels.join(' · '):'點此填入優惠通路'}
       </small>
      </span>
      <Pencil size={15}/>
     </button>)}
     {!offers.length&&<p>新增優惠活動，填入適用通路與回饋率。</p>}
    </details>
   </article>;
  })}
  <button className="add-card" disabled={!ready||saving} onClick={()=>onEdit({type:'card'})}><Plus size={25}/>新增信用卡</button>
 </section>;
}
