import type {Campaign} from './ledger';

export function displayPeriod(c:Campaign,p:{start:string;end:string}){
 if(p.start<=p.end)return `${p.start} — ${p.end}`;
 if(c.start&&c.end)return `${c.start} — ${c.end}`;
 if(c.start)return `${c.start} 起`;
 if(c.end)return `至 ${c.end}`;
 return '無適用期間';
}
