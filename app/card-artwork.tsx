'use client';
import {useState} from 'react';
import {CreditCard} from 'lucide-react';
import {Card} from '../lib/ledger';
import {cardImage,cardImageZoom} from '../lib/card-images';

export function CardArtwork({card,compact=false}:{card:Card;compact?:boolean}){
 const src=cardImage(card),[failedSrc,setFailedSrc]=useState('');
 const zoom=card.imageZoom??cardImageZoom(src);
 const offset=src==='https://bank.sinopac.com/upload/sinopac/picture/16c98d0bff700000bd35.jpg'?' translateY(2.5%)':'';
 return src&&failedSrc!==src?<div className={compact?'card-thumb-frame':'card-art-frame'}><img src={src} alt={compact?'':`${card.name} 卡面`} loading="lazy" referrerPolicy="no-referrer" style={{transform:`scale(${zoom})${offset}`}} onError={()=>setFailedSrc(src)}/></div>:compact?<CreditCard size={18}/>:<div className="card-face" style={{background:card.color}}><span>{card.bank||'我的信用卡'}</span><CreditCard size={27}/><h2>{card.name}</h2><small>CARD LEDGER</small></div>;
}
