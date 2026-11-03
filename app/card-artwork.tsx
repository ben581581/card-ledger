'use client';
import {useState} from 'react';
import {Card} from '../lib/ledger';
import {cardImage,cardImageZoom} from '../lib/card-images';

export function CardArtwork({card,compact=false}:{card:Card;compact?:boolean}){
 const src=cardImage(card),[failedSrc,setFailedSrc]=useState(''),[portraitSrc,setPortraitSrc]=useState('');
 const zoom=card.imageZoom??cardImageZoom(src);
 const offset=src==='https://bank.sinopac.com/upload/sinopac/picture/16c98d0bff700000bd35.jpg'?' translateY(2.5%)':'';
 const face=src&&failedSrc!==src
  ?<div className="art"><img src={src} className={portraitSrc===src?'portrait':undefined} alt={compact?'':`${card.name} 卡面`} loading="lazy" referrerPolicy="no-referrer" style={{transform:`scale(${zoom})${offset}`}} onLoad={e=>{if(e.currentTarget.naturalHeight>e.currentTarget.naturalWidth*1.15)setPortraitSrc(src);}} onError={()=>setFailedSrc(src)}/></div>
  :<div className="art art-face" style={{'--c':card.color} as React.CSSProperties}><small>{card.bank||'CARDI'}</small><span className="chipmark"/><b>{card.name}</b></div>;
 return <div className={compact?'thumb art-wrap':'art-wrap'}>{face}</div>;
}
