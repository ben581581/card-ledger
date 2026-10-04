'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {empty,type Ledger} from '../lib/ledger';
import {ledgerCacheKey,readLedgerCache,validSnapshot,writeLedgerCache,type LedgerSnapshot} from '../lib/ledger-cache';

export function useLedger(editing:boolean){
 const [data,setData]=useState<Ledger>(empty),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[syncing,setSyncing]=useState(false),[ready,setReady]=useState(false),[cached,setCached]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false),[updated,setUpdated]=useState(''),[notice,setNotice]=useState('');
 const snapshot=useRef<LedgerSnapshot|null>(null),request=useRef<AbortController|null>(null),writing=useRef(false),editingRef=useRef(editing),lastActivity=useRef(Date.now());
 useEffect(()=>{editingRef.current=editing;},[editing]);
 const accept=useCallback((value:LedgerSnapshot)=>{
  snapshot.current=value;setData(value.data);setUpdated(value.updatedAt||'');setReady(true);setCached(false);
  try{writeLedgerCache(localStorage,value);}catch{}
 },[]);
 const cancelRead=useCallback(()=>{
  if(writing.current)return false;
  request.current?.abort();request.current=null;setSyncing(false);return true;
 },[]);
 const load=useCallback(async()=>{
  if(request.current||writing.current)return;
  const controller=new AbortController();request.current=controller;setSyncing(true);setError('');
  try{
   const known=snapshot.current;
   const response=await fetch('/api/ledger',{cache:'no-store',signal:controller.signal,headers:known?{'If-None-Match':`"ledger-${known.revision}"`}:undefined});
   if(request.current!==controller)return;
   if(response.status===304&&known){setCached(false);setConflict(false);return;}
   const body=await response.json();
   if(request.current!==controller)return;
   if(!response.ok)throw Error(body.error||'雲端暫時無法連線');
   if(!validSnapshot(body))throw Error('雲端資料格式異常，請重新整理。');
   accept(body);setConflict(false);
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'雲端暫時無法連線');}
  finally{if(request.current===controller){request.current=null;setSyncing(false);setLoading(false);}}
 },[accept]);
 useEffect(()=>{
  try{const value=readLedgerCache(localStorage);if(value){snapshot.current=value;setData(value.data);setUpdated(value.updatedAt||'');setReady(true);setCached(true);setLoading(false);}}catch{}
  void load();return()=>{request.current?.abort();request.current=null;};
 },[load]);
 useEffect(()=>{
  const touch=()=>{lastActivity.current=Date.now();};
  const refresh=()=>{if(!editingRef.current&&!writing.current&&document.visibilityState==='visible'&&Date.now()-lastActivity.current<120000)void load();};
  const resume=()=>{touch();refresh();};
  const storage=(event:StorageEvent)=>{if(event.key===ledgerCacheKey)refresh();};
  window.addEventListener('pointerdown',touch,{passive:true});window.addEventListener('keydown',touch);window.addEventListener('focus',resume);window.addEventListener('storage',storage);document.addEventListener('visibilitychange',resume);
  const timer=setInterval(refresh,60000);
  return()=>{clearInterval(timer);window.removeEventListener('pointerdown',touch);window.removeEventListener('keydown',touch);window.removeEventListener('focus',resume);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',resume);};
 },[load]);
 useEffect(()=>{if(!saving)return;const guard=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[saving]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(timer);},[notice]);
 const save=useCallback(async(next:Ledger,optimistic=false)=>{
  const before=snapshot.current;if(writing.current||!before)return false;
  cancelRead();writing.current=true;setSaving(true);setNotice('');setError('');setConflict(false);
  if(optimistic)setData(next);
  try{
   const response=await fetch('/api/ledger',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:next,revision:before.revision})});
   const body=await response.json();
   if(response.status===409){setConflict(true);throw Error('帳簿已有其他人更新。請先同步最新資料，表單內容會保留；確認後再次儲存。');}
   if(!response.ok)throw Error(body.error||'儲存失敗，請重試。');
   const saved={data:next,revision:body.revision,updatedAt:body.updatedAt};
   if(!validSnapshot(saved))throw Error('未能確認儲存結果，請同步後重試。');
   accept(saved);setNotice('已儲存到雲端');return true;
  }catch(e){if(optimistic)setData(before.data);setError(e instanceof Error?e.message:'儲存失敗，輸入仍保留。');return false;}
  finally{writing.current=false;setSaving(false);}
 },[accept,cancelRead]);
 return {data,loading,saving,syncing,ready,cached,error,setError,conflict,setConflict,updated,notice,load,cancelRead,save};
}
