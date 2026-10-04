'use client';
import {useState} from 'react';
import {CalendarCheck,Check,Settings2,Info,ChevronDown,ArrowUpRight} from 'lucide-react';
import {type Registration,safeRegistrationUrl} from '../lib/registration';

export function RegistrationNotice({value,name}:{value?:Registration;name:string}){
 if(!value)return null;
 const Icon=value.type==='required'?CalendarCheck:value.type==='setup'?Settings2:value.type==='none'?Check:Info;
 return <details className={`registration-notice registration-${value.type}`}>
  <summary aria-label={`${name}：${value.label}`}><Icon size={14} aria-hidden="true"/><span>{value.label}</span><ChevronDown size={14} aria-hidden="true"/></summary>
  <div className="registration-detail">{value.details&&<p>{value.details}</p>}{value.url&&safeRegistrationUrl(value.url)&&<a href={value.url} target="_blank" rel="noreferrer">官方說明與登錄入口<ArrowUpRight size={13} aria-hidden="true"/></a>}</div>
 </details>;
}

export function RegistrationFields({value}:{value?:Registration}){
 const [type,setType]=useState(value?.type||'');
 return <details className="registration-editor" open={type!==''||undefined}>
  <summary>登錄與設定提醒 <small>選填</small><ChevronDown size={15} aria-hidden="true"/></summary>
  <div><label>提醒類型<select name="registrationType" value={type} onChange={e=>setType(e.target.value as Registration['type'])}><option value="">不顯示提醒</option><option value="required">需登錄／領券</option><option value="setup">需設定／切換／訂閱</option><option value="none">免登錄</option><option value="verify">待核對</option></select></label>
  {type&&<><label>提醒標籤<input name="registrationLabel" maxLength={40} defaultValue={value?.label} placeholder="例如：每季需登錄、每月需領券"/></label><label>登錄時間與必要條件<textarea name="registrationDetails" maxLength={350} defaultValue={value?.details} placeholder="例如：每月 15 日 10:00 開放，額滿為止。"/></label><label>官方說明／登錄網址<input name="registrationUrl" type="url" maxLength={2000} defaultValue={value?.url} placeholder="https://…"/></label></>}
  <p className="form-help">這是參加條件提醒；實際是否登錄成功，請到銀行官方 App 或網站確認。</p></div>
 </details>;
}
