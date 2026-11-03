'use client';
import {useState} from 'react';
import {CalendarCheck,Check,Settings2,Info,ArrowUpRight} from 'lucide-react';
import {type Registration,safeRegistrationUrl} from '../lib/registration';

// A reminder of enrollment conditions; it never implies the user has enrolled.
export function RegistrationNotice({value}:{value?:Registration}){
 if(!value)return null;
 const Icon=value.type==='required'?CalendarCheck:value.type==='setup'?Settings2:value.type==='none'?Check:Info;
 return <div className={`reg reg-${value.type}`}><Icon size={18} style={{marginTop:1}}/><div style={{minWidth:0}}>
  <b>{value.label}</b>
  {value.details&&<p>{value.details}</p>}
  {value.url&&safeRegistrationUrl(value.url)&&<a href={value.url} target="_blank" rel="noreferrer">官方說明與登錄<ArrowUpRight size={13}/></a>}
 </div></div>;
}

export function RegistrationFields({value}:{value?:Registration}){
 const [type,setType]=useState(value?.type||'');
 return <>
  <div className="form-label">登錄提醒</div>
  <div className="form-group">
   <label className="field"><span>提醒類型</span><select name="registrationType" value={type} onChange={e=>setType(e.target.value as Registration['type'])}><option value="">不顯示</option><option value="required">需登錄／領券</option><option value="setup">需設定／切換</option><option value="none">免登錄</option><option value="verify">待核對</option></select></label>
   {type&&<>
    <label className="field"><span>標籤</span><input name="registrationLabel" maxLength={40} defaultValue={value?.label} placeholder="例如：每月需登錄"/></label>
    <label className="field stack"><span>時間與條件</span><textarea name="registrationDetails" maxLength={350} rows={2} defaultValue={value?.details} placeholder="例如：每月 15 日 10:00 開放，額滿為止"/></label>
    <label className="field"><span>官方網址</span><input name="registrationUrl" type="url" maxLength={2000} defaultValue={value?.url} placeholder="https://"/></label>
   </>}
  </div>
  <p className="form-foot">僅作為提醒，是否登錄成功請以銀行 App 為準。</p>
 </>;
}
