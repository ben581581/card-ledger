'use client';
import {useState} from 'react';
import {Download,LoaderCircle,Check} from 'lucide-react';
import {cardImages,matchedCardImage} from '../lib/card-images';
import {uploadedImagePath} from '../lib/uploaded-images';

export function OfficialImage({name,bank,imageUrl,busy,onBusy,onFetched}:{name:string;bank:string;imageUrl:string;busy:boolean;onBusy:(busy:boolean)=>void;onFetched:(url:string,zoom:number)=>void}){
 const [working,setWorking]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<{name:string;source:string}|null>(null);
 const matched=cardImages.find(c=>c.url===imageUrl)||matchedCardImage(name,bank);
 async function fetchImage(){
  setError('');setResult(null);
  if(!matched){setError('尚未收錄此卡。請用「選擇卡面」挑選官方卡面，或上傳自己的圖片。');return;}
  setWorking(true);onBusy(true);
  try{
   const response=await fetch('/api/card-images/official',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageId:matched.id})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error);
   if(typeof data.url!=='string'||!uploadedImagePath.test(data.url))throw Error('卡面取得失敗，請重試。');
   onFetched(data.url,data.zoom);setResult({name:data.name,source:data.source});
  }catch(e){setError((e as Error).message);}finally{setWorking(false);onBusy(false);}
 }
 return <div className="official-fetch"><button type="button" className="outline" disabled={busy||working} onClick={()=>void fetchImage()}>{working?<LoaderCircle size={17} className="spin"/>:<Download size={17}/>} {working?'官網抓取中…':'從官網抓卡面'}</button>{result?<small className="official-success" role="status"><Check size={15}/><span>已取得 {result.name}，儲存卡片後套用。<a href={result.source} target="_blank" rel="noreferrer">官網來源 ↗</a></span></small>:<small>{matched?`將取得：${matched.name}`:'依卡名配對，或先從「選擇卡面」挑選。'}</small>}{error&&<p className="error" role="alert">{error}</p>}</div>;
}
