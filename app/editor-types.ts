import type {Card,Campaign,Entry} from '../lib/ledger';
export type Modal={type:'card'|'campaign'|'entry';value?:Card|Campaign|Entry;cardId?:string;isNew?:boolean};
