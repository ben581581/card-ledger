import type {Card,Campaign} from '../lib/ledger';
export type Modal={type:'card'|'campaign';value?:Card|Campaign;cardId?:string;isNew?:boolean};
