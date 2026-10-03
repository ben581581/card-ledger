'use client';
import {useRef,useState} from 'react';
import {Upload,Check,ImagePlus} from 'lucide-react';
import {maxImageBytes} from '../lib/uploaded-images';

async function compressImage(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('請選擇 JPG、PNG 或 WebP 圖片。');
 if(file.size>15_000_000)throw Error('原始圖片請小於 15 MB。');
 const local=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=local;await image.decode().catch(()=>{throw Error('無法讀取圖片，請選擇有效的 JPG、PNG 或 WebP。');});
  const scale=Math.min(1,960/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw Error('這個瀏覽器無法處理圖片。');context.drawImage(image,0,0,canvas.width,canvas.height);
  for(const quality of [.86,.7,.5]){
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',quality));
   if(blob&&blob.size<=maxImageBytes)return blob;
  }
  throw Error('圖片壓縮後仍太大，請選擇較簡單或較小的卡面圖片。');
 }catch(e){if(e instanceof Error&&e.message)throw e;throw Error('無法讀取圖片，請換一張再試。');}
 finally{URL.revokeObjectURL(local);}
}

export function ImageUpload({url,busy,onUploaded,onBusy}:{url:string;busy:boolean;onUploaded:(url:string)=>void;onBusy:(busy:boolean)=>void}){
 const input=useRef<HTMLInputElement>(null),[uploading,setUploading]=useState(false),[error,setError]=useState('');
 async function upload(file:File){
  setUploading(true);onBusy(true);setError('');
  try{const blob=await compressImage(file);const response=await fetch('/api/card-images',{method:'POST',headers:{'Content-Type':blob.type},body:blob});const result=await response.json();if(!response.ok)throw Error(result.error||'圖片上傳失敗');onUploaded(result.url);}
  catch(e){setError((e as Error).message||'圖片無法讀取，請重試。');}
  finally{setUploading(false);onBusy(false);if(input.current)input.current.value='';}
 }
 return <div className="upload-panel"><input ref={input} className="upload-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="選擇卡面圖片" disabled={busy||uploading} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);}}/>
  <div className="upload-symbol"><ImagePlus size={24}/></div><strong>{url?'更換你的卡面':'上傳自己的卡面'}</strong><span>從手機相簿或電腦選擇圖片</span>
  <button type="button" className="outline" disabled={busy||uploading} onClick={()=>input.current?.click()}><Upload size={16}/>{uploading?'處理並上傳中…':url?'更換圖片':'選擇圖片'}</button>
  {url&&<small className="upload-success"><Check size={14}/>圖片已就緒，儲存卡片後套用</small>}
  <small>支援 JPG、PNG、WebP · 自動壓縮 · 雲端同步</small>{error&&<p role="alert" className="error">{error}</p>}
 </div>;
}
