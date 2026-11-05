import type {Campaign} from '../lib/ledger';
import type {Row,Status} from '../lib/insights';

const formatter=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:2});
const compactFormatter=new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0});
export const money=(n:number)=>formatter.format(n);
export const whole=(n:number)=>compactFormatter.format(Math.floor(n));
export const rate=(n:number)=>formatter.format(n);
/** Long marketing labels do not fit a row; the number does. */
export const shortRate=(c:Pick<Campaign,'kind'|'rate'|'rateLabel'>)=>{
 if(c.kind==='spend')return '滿額';
 const label=c.rateLabel?.trim();
 return label&&label.length<=7?label:c.rate>0?`${rate(c.rate)}%`:'優惠';
};
export const periodNames:Record<Campaign['period'],string>={month:'每月',bill:'帳單週期',quarter:'每季',custom:'指定期間'};
export const statusNames:Record<Status,string>={near:'接近上限',open:'可刷',unset:'未設定回饋率',full:'已滿額',upcoming:'尚未開始',ended:'已結束'};

export function statusLabel(r:Row){
 if(r.c.kind==='spend'){
  if(r.status==='full')return '已達標';
  if(r.status==='near')return '快達標';
  if(r.status==='open')return '累積中';
 }
 return statusNames[r.status];
}

export function daysText(days:number){
 if(!Number.isFinite(days))return '長期';
 return days<=1?'今天截止':`剩 ${days} 天`;
}

export function shortDate(value:string){
 if(!value)return '';
 const [,m,d]=value.split('-');
 return `${Number(m)}/${Number(d)}`;
}

export function rangeText(start:string,end:string){
 if(start&&end)return `${shortDate(start)} – ${shortDate(end)}`;
 if(start)return `${shortDate(start)} 起`;
 if(end)return `至 ${shortDate(end)}`;
 return '長期適用';
}

export function monthTitle(on:string){
 const [y,m]=on.split('-');
 return `${y} 年 ${Number(m)} 月`;
}
