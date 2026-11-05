'use client';
import {useState} from 'react';
import type {Card} from '../../lib/ledger';
import {cardImage,cardImageZoom} from '../../lib/card-images';
import {type CatalogCard,faceColors} from '../../lib/catalog';

export function CardArt({card,compact=false}:{card:Card;compact?:boolean}){
 const src=cardImage(card),[failed,setFailed]=useState(''),[portrait,setPortrait]=useState('');
 const zoom=card.imageZoom??cardImageZoom(src);
 const offset=src==='https://bank.sinopac.com/upload/sinopac/picture/16c98d0bff700000bd35.jpg'?' translateY(2.5%)':'';
 return <div className={compact?'thumb art-wrap':'art-wrap'}>
  {src&&failed!==src
   ?<div className="art"><img src={src} className={portrait===src?'portrait':undefined} alt={compact?'':`${card.name} 卡面`} loading="lazy" decoding="async" referrerPolicy="no-referrer" style={{transform:`scale(${zoom})${offset}`}} onLoad={e=>{if(e.currentTarget.naturalHeight>e.currentTarget.naturalWidth*1.15)setPortrait(src);}} onError={()=>setFailed(src)}/></div>
   :<div className="art art-face" style={{'--c':card.color} as React.CSSProperties}><small>{card.bank||'CARDI'}</small><b>{card.name}</b></div>}
 </div>;
}

/** Catalog cards share one drawn face, tinted by bank, instead of a mix of hot-linked bank images. */
export function CatalogFace({entry}:{entry:Pick<CatalogCard,'name'|'bank'|'hue'>}){
 const [a,b]=faceColors(entry.hue);
 return <div className="art-wrap"><div className="art art-face tinted" style={{'--a':a,'--b':b} as React.CSSProperties}><small>{entry.bank}</small><b>{entry.name}</b></div></div>;
}
