'use client';
import {useState} from 'react';
import {Download,LoaderCircle,Check} from 'lucide-react';
import {cardImages,matchedCardImage} from '../lib/card-images';
import {uploadedImagePath} from '../lib/uploaded-images';

export function OfficialImage({name,bank,imageUrl,busy,onBusy,onFetched}:{name:string;bank:string;imageUrl:string;busy:boolean;onBusy:(busy:boolean)=>void;onFetched:(url:string,zoom:number)=>void}){
 const [working,setWorking]=useState(false),[error,setError]=useState(''),[result,setResult]=useState<{name:string;source:string}|null>(null);
 const matched=cardImages.find(c=>c.url===imageUrl)||matchedCardImage(name,bank);
 if(!matched)return null;
 async function fetchImage(){
  setError('');setResult(null);setWorking(true);onBusy(true);
  try{
   const response=await fetch('/api/card-images/official',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageId:matched!.id})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error);
   if(typeof data.url!=='string'||!uploadedImagePath.test(data.url))throw Error('卡面取得失敗，請重試。');
   onFetched(data.url,data.zoom);setResult({name:data.name,source:data.source});
  }catch(e){setError((e as Error).message||'卡面取得失敗，請重試。');}finally{setWorking(false);onBusy(false);}
 }
 return <>
  <button type="button" className="btn btn-gray btn-block" style={{marginTop:10,height:44,fontSize:15}} disabled={busy||working} onClick={()=>void fetchImage()}>{working?<LoaderCircle size={16} className="spin"/>:<Download size={16}/>}{working?'官網抓取中…':`從官網存一份「${matched.name}」`}</button>
  {result?<p className="form-foot" style={{color:'var(--green)',display:'flex',gap:5}}><Check size={14}/>已取得，儲存卡片後套用。<a href={result.source} target="_blank" rel="noreferrer" style={{textDecoration:'underline'}}>來源</a></p>:<p className="form-foot">存到雲端可避免官網圖片失效。</p>}
  {error&&<p className="inline-error" role="alert">{error}</p>}
 </>;
}
