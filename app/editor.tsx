'use client';
import {useState,type FormEvent} from 'react';
import {Trash2} from 'lucide-react';
import type {Card,Campaign} from '../lib/ledger';
import {cardImages,cardImageZoom,matchedCardImage} from '../lib/card-images';
import {uploadedImagePath} from '../lib/uploaded-images';
import {CardArt} from './ui/card-art';
import {ImageUpload} from './image-upload';
import {OfficialImage} from './official-image';
import {RegistrationFields} from './registration-notice';
import {Sheet} from './ui/sheet';
import type {Modal} from './editor-types';
import {periodNames} from './format';

const colors=[['#2563eb','藍'],['#7c3aed','紫'],['#0e7490','青'],['#be185d','桃紅'],['#b45309','琥珀'],['#334155','石墨']];
type Props={modal:Modal;cards:Card[];campaigns:Campaign[];busy:boolean;error:string;conflict:boolean;onSync:()=>Promise<void>;onClose:()=>void;onSubmit:(e:FormEvent<HTMLFormElement>)=>void;onDelete?:()=>void};

export default function Editor(props:Props){
 const {modal,busy,error,conflict,onSync,onClose,onSubmit,onDelete}=props;
 const [uploading,setUploading]=useState(false);
 const editing=!!modal.value?.id&&!modal.isNew;
 const noun=modal.type==='card'?'卡片':'活動';
 const title=`${editing?'編輯':'新增'}${noun}`;
 const locked=busy||uploading;
 return <Sheet title={title} full locked={locked} onClose={onClose}
  left={<button type="button" className="text" disabled={locked} onClick={onClose}>取消</button>}
  right={<button type="submit" form="editor-form" className="text strong" disabled={locked}>{uploading?'處理中':busy?'儲存中':'儲存'}</button>}>
  <form id="editor-form" onSubmit={e=>{if(uploading){e.preventDefault();return;}onSubmit(e);}}>
   <fieldset disabled={locked} style={{border:0,margin:0,padding:0,minWidth:0}}>
    {modal.type==='campaign'?<CampaignForm {...props}/>:<CardForm {...props} onBusy={setUploading}/>}
   </fieldset>
   {error&&<div role="alert" className="inline-error">{error}{conflict&&<button type="button" disabled={busy} onClick={()=>void onSync()}>同步最新帳簿（表單會保留）</button>}</div>}
   {editing&&onDelete&&<button type="button" className="btn btn-danger btn-block" style={{marginTop:28}} disabled={locked} onClick={onDelete}><Trash2 size={17}/>刪除{noun}</button>}
  </form>
 </Sheet>;
}

/* ── 活動 ───────────────────────────────────────────────── */
function CampaignForm({modal,cards}:Props){
 const a=modal.value as Campaign|undefined,editing=!!a?.id;
 const [cardId,setCardId]=useState(modal.cardId||a?.cardId||cards[0]?.id||'');
 const card=cards.find(c=>c.id===cardId);
 const [kind,setKind]=useState<Campaign['kind']>(a?.kind||(card?.lookupOnly?'unlimited':'reward'));
 const [period,setPeriod]=useState<Campaign['period']>(a?.period||'month');
 const [queryOnly,setQueryOnly]=useState(a?.queryOnly||false);
 const lookup=!!card?.lookupOnly||queryOnly;
 const custom=period==='custom'&&kind!=='unlimited';
 const kinds:[Campaign['kind'],string][]=[['reward','回饋上限'],['spend','消費滿額'],['unlimited','無上限']];
 return <>
  <div className="form-label">基本資料</div>
  <div className="form-group">
   <label className="field"><span>信用卡</span><select name={editing?undefined:'cardId'} value={cardId} disabled={editing} onChange={ev=>{setCardId(ev.target.value);if(cards.find(c=>c.id===ev.target.value)?.lookupOnly)setKind('unlimited');}}>{!card&&<option value={cardId} disabled>原卡片已刪除</option>}{cards.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
   <label className="field"><span>名稱</span><input name="name" required maxLength={100} defaultValue={a?.name} placeholder="例如：網購加碼"/></label>
  </div>
  {editing&&<input type="hidden" name="cardId" value={cardId}/>}

  <div className="form-label">類型</div>
  <div className="segmented" role="group" aria-label="優惠類型">{kinds.map(([k,label])=><button type="button" key={k} aria-pressed={kind===k} onClick={()=>setKind(k)}>{label}</button>)}</div>
  <input type="hidden" name="kind" value={kind}/>
  <p className="form-foot">{kind==='reward'?'回饋有上限：用上限 ÷ 回饋率換算還能刷多少。':kind==='spend'?'累積消費達門檻：追蹤還差多少達標。':'不設上限，只用於優惠查詢與比較。'}</p>

  <div className="form-group" style={{marginTop:14}}>
   {kind!=='unlimited'&&<label className="field"><span>計算週期</span><select value={period} onChange={ev=>setPeriod(ev.target.value as Campaign['period'])}><option value="month">每月（日曆月）</option><option value="bill">帳單週期</option><option value="quarter">每季</option><option value="custom">指定起訖日</option></select></label>}
   <input type="hidden" name="period" value={period}/>
   {kind!=='unlimited'?<label className="field"><span>{kind==='reward'?'回饋上限':'消費門檻'}</span><input name="target" type="number" inputMode="decimal" min="0.01" max="10000000000" step="0.01" required defaultValue={a?.target||''} placeholder="0"/><span className="unit">NT$</span></label>:<input type="hidden" name="target" value="0"/>}
   {kind!=='spend'?<label className="field"><span>回饋率</span><input name="rate" type="number" inputMode="decimal" min="0" max="100" step="0.01" required defaultValue={a?.rate??(kind==='unlimited'?'':3)} placeholder="0"/><span className="unit">%</span></label>:<input type="hidden" name="rate" value={a?.rate||0}/>}
   {!card?.lookupOnly&&kind!=='unlimited'&&<label className="field"><span style={{flex:1}}>只查詢，不追蹤進度</span><span className="toggle"><input type="checkbox" name="queryOnly" value="yes" checked={queryOnly} onChange={ev=>setQueryOnly(ev.target.checked)}/><i/></span></label>}
   {lookup&&kind!=='spend'?<label className="field"><span>顯示文字</span><input name="rateLabel" maxLength={80} defaultValue={a?.rateLabel} placeholder="例如：3.3–10%"/></label>:<input type="hidden" name="rateLabel" value={a?.rateLabel||''}/>}
  </div>
  {card?.lookupOnly&&<input type="hidden" name="queryOnly" value={queryOnly?'yes':'no'}/>}
  {!card?.lookupOnly&&kind!=='unlimited'&&<p className="form-foot">有筆數、單日上限、跨卡合併等複雜條件時，可改為只查詢。</p>}

  <div className="form-label">{custom?'活動期間':'活動期間（選填）'}</div>
  <div className="form-group">
   <label className="field"><span>開始</span><input name="start" type="date" required={custom} defaultValue={a?.start}/></label>
   <label className="field"><span>結束</span><input name="end" type="date" required={custom} defaultValue={a?.end}/></label>
  </div>
  <p className="form-foot">{kind==='unlimited'?'都留空代表長期適用。':'活動期間會再裁切每個計算週期。'}</p>

  <div className="form-label">適用通路與條件</div>
  <div className="form-group">
   <label className="field stack"><span>通路（逗號、頓號或換行分隔）</span><textarea name="channels" rows={3} maxLength={8000} defaultValue={a?.channels?.join('、')} placeholder="蝦皮、momo、PChome"/></label>
   <label className="field stack"><span>條件備註</span><textarea name="notes" rows={3} maxLength={500} defaultValue={a?.notes} placeholder="例如：需登錄，限指定通路"/></label>
  </div>
  <RegistrationFields value={a?.registration}/>
 </>;
}

/* ── 卡片 ───────────────────────────────────────────────── */
function CardForm({modal,busy,onBusy}:Props&{onBusy:(v:boolean)=>void}){
 const c=modal.value as Card|undefined;
 const [name,setName]=useState(c?.name||''),[bank,setBank]=useState(c?.bank||'');
 const [lookupOnly,setLookupOnly]=useState(c?.lookupOnly||false),[closeDay,setCloseDay]=useState(String(c?.closeDay||15)),[color,setColor]=useState(c?.color||colors[0][0]);
 const [mode,setMode]=useState(c?.imageUrl===undefined?'auto':c.imageUrl===''?'none':uploadedImagePath.test(c.imageUrl)?'upload':'custom');
 const [url,setUrl]=useState(c?.imageUrl||''),[zoom,setZoom]=useState<number|undefined>(c?.imageZoom);
 const matched=matchedCardImage(name,bank);
 const actualZoom=zoom??cardImageZoom(mode==='auto'?matched?.url||'':url);
 const previewUrl=mode==='auto'?undefined:mode==='none'||(mode==='upload'&&!uploadedImagePath.test(url))?'':url;
 return <>
  <div style={{width:'72%',margin:'6px auto 4px'}}><CardArt key={`${mode}-${url}-${name}-${bank}`} card={{id:'preview',name:name||'我的信用卡',bank,color,closeDay:15,imageZoom:actualZoom,...(previewUrl===undefined?{}:{imageUrl:previewUrl})}}/></div>
  <div className="form-label">卡片資料</div>
  <div className="form-group">
   <label className="field"><span>名稱</span><input name="name" required maxLength={100} value={name} onChange={ev=>setName(ev.target.value)} placeholder="例如：永豐 SPORT 卡"/></label>
   <label className="field"><span>銀行</span><input name="bank" maxLength={100} value={bank} onChange={ev=>setBank(ev.target.value)} placeholder="例如：永豐銀行"/></label>
   {!lookupOnly&&<label className="field"><span>結帳日</span><input name="closeDay" type="number" inputMode="numeric" min={1} max={31} required value={closeDay} onChange={ev=>setCloseDay(ev.target.value)}/><span className="unit">日</span></label>}
   <label className="field"><span style={{flex:1}}>只查詢優惠，不追蹤額度</span><span className="toggle"><input type="checkbox" checked={lookupOnly} onChange={ev=>setLookupOnly(ev.target.checked)}/><i/></span></label>
  </div>
  {lookupOnly&&<input type="hidden" name="closeDay" value={closeDay||15}/>}
  <input type="hidden" name="lookupOnly" value={lookupOnly?'yes':'no'}/>
  <p className="form-foot">{lookupOnly?'適合無上限回饋卡：只出現在優惠搜尋。':'當月沒有此日期時，以月底為結帳日。'}</p>

  <div className="form-label">卡面</div>
  <div className="form-group">
   <label className="field"><span>來源</span><select name="imageMode" value={mode} onChange={ev=>setMode(ev.target.value)}><option value="auto">依名稱配對官方卡面</option><option value="upload">上傳／雲端圖片</option><option value="custom">選擇卡面或網址</option><option value="none">簡約卡面</option></select></label>
   {mode==='auto'&&<div className="field"><span className="cell-sub" style={{minWidth:0}}>{matched?`已配對：${matched.name}`:'未配對到卡面，可改用其他來源。'}</span></div>}
   {mode==='custom'&&<>
    <label className="field"><span>官方卡面</span><select value={cardImages.find(i=>i.url===url)?.id||''} onChange={ev=>{const image=cardImages.find(i=>i.id===ev.target.value);if(image)setUrl(image.url);}}><option value="">自訂網址</option>{cardImages.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
    <label className="field"><span>圖片網址</span><input name="imageUrl" type="url" maxLength={2000} required value={url} onChange={ev=>setUrl(ev.target.value)} placeholder="https://"/></label>
   </>}
   {mode==='upload'&&<><ImageUpload url={uploadedImagePath.test(url)?url:''} busy={busy} onBusy={onBusy} onUploaded={u=>{setUrl(u);setZoom(1);}}/><input type="hidden" name="imageUrl" value={uploadedImagePath.test(url)?url:''}/></>}
   {mode!=='none'&&<div className="range"><input type="range" name="imageZoom" min="1" max="2" step="0.01" value={actualZoom} onChange={ev=>setZoom(Number(ev.target.value))} aria-label="卡面縮放"/><span className="num">{Math.round(actualZoom*100)}%</span></div>}
  </div>
  {mode!=='none'&&<OfficialImage name={name} bank={bank} imageUrl={mode==='custom'?url:''} busy={busy} onBusy={onBusy} onFetched={(u,z)=>{setUrl(u);setMode('upload');setZoom(z);}}/>}

  <div className="form-label">簡約卡面顏色</div>
  <div className="chips" role="radiogroup" aria-label="卡片顏色">{colors.map(([value,label])=><button type="button" key={value} className="chip" aria-pressed={color===value} onClick={()=>setColor(value)}><span style={{width:14,height:14,borderRadius:'50%',background:value,display:'inline-block'}}/>{label}</button>)}</div>
  <input type="hidden" name="color" value={color}/>
 </>;
}
