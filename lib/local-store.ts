import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {empty,type Ledger} from './ledger';

// Without DATABASE_URL, development reads and writes a file under work/ (git-ignored),
// so the app can be run against a copy of the ledger without touching the shared cloud one.
const dir=join(process.cwd(),'work'),file=join(dir,'local-ledger.json'),seed=join(dir,'seed-ledger.json');
type Stored={data:Ledger;revision:number;updatedAt:string|null};

export const usesLocalStore=()=>!process.env.DATABASE_URL&&process.env.NODE_ENV!=='production';
export function readLocal():Stored{
 for(const path of [file,seed])if(existsSync(path))return JSON.parse(readFileSync(path,'utf8')) as Stored;
 return {data:empty,revision:0,updatedAt:null};
}
export function writeLocal(data:Ledger,revision:number):Stored|null{
 const current=readLocal();
 if(current.revision!==revision)return null;
 const next={data,revision:revision+1,updatedAt:new Date().toISOString()};
 mkdirSync(dir,{recursive:true});writeFileSync(file,JSON.stringify(next));
 return next;
}
