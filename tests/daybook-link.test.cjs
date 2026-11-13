const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const previous=require.extensions['.ts'];
require.extensions['.ts']=(module,path)=>module._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path);
const {upsertLinked,removeLinked,linkedId,linkAuthorized}=require('../lib/daybook-link.ts');
require.extensions['.ts']=previous;

const id='7f0e2c1a-3b4d-4e5f-8a9b-0c1d2e3f4a5b';
const campaign=(cid,extra={})=>({id:cid,cardId:'a',name:cid,kind:'reward',period:'month',target:300,rate:3,start:'',end:'',notes:'',...extra});
const ledger=()=>({cards:[{id:'a',name:'A',bank:'',closeDay:15,color:'#334155'},{id:'look',name:'L',bank:'',closeDay:1,color:'#334155',lookupOnly:true}],
 campaigns:[campaign('shopee',{channels:['蝦皮']}),campaign('everyday',{rate:1})],entries:[{id:'own',cardId:'a',date:'2026-11-01',amount:50,note:'',campaignIds:['everyday'],reward:null}]});
const input={id,cardId:'a',date:'2026-11-05',amount:900,note:'蝦皮'};

test('a purchase from Daybook is filed under the offers its merchant matches',()=>{
 const next=upsertLinked(ledger(),input);
 const entry=next.entries.find(e=>e.id===linkedId(id));
 assert.deepEqual([...entry.campaignIds].sort(),['everyday','shopee']);
 assert.equal(next.entries.length,2);
});
test('an amount edit keeps offers chosen by hand; a new merchant is matched again',()=>{
 const first=upsertLinked(ledger(),input);
 const fixed={...first,entries:first.entries.map(e=>e.id===linkedId(id)?{...e,campaignIds:['shopee'],reward:20}:e)};
 const edited=upsertLinked(fixed,{...input,amount:1200}).entries.find(e=>e.id===linkedId(id));
 assert.deepEqual(edited.campaignIds,['shopee']);assert.equal(edited.reward,20);assert.equal(edited.amount,1200);
 const renamed=upsertLinked(fixed,{...input,note:'午餐'}).entries.find(e=>e.id===linkedId(id));
 assert.deepEqual([...renamed.campaignIds].sort(),['everyday','shopee']);assert.equal(renamed.reward,null);
});
test('unknown and lookup-only cards are refused; removal only touches the copy Daybook made',()=>{
 assert.equal(upsertLinked(ledger(),{...input,cardId:'nope'}),null);
 assert.equal(upsertLinked(ledger(),{...input,cardId:'look'}),null);
 const data=ledger();
 assert.equal(removeLinked(data,id),data);
 assert.deepEqual(removeLinked(upsertLinked(data,input),id).entries.map(e=>e.id),['own']);
});
test('the link needs the shared secret',()=>{
 const before=process.env.DAYBOOK_LINK_SECRET;
 process.env.DAYBOOK_LINK_SECRET='s'.repeat(40);
 try{
  assert.equal(linkAuthorized(new Request('http://x/',{headers:{authorization:'Bearer '+'s'.repeat(40)}})),true);
  assert.equal(linkAuthorized(new Request('http://x/',{headers:{authorization:'Bearer '+'t'.repeat(40)}})),false);
  assert.equal(linkAuthorized(new Request('http://x/')),false);
  process.env.DAYBOOK_LINK_SECRET='short';
  assert.equal(linkAuthorized(new Request('http://x/',{headers:{authorization:'Bearer short'}})),false);
 }finally{if(before===undefined)delete process.env.DAYBOOK_LINK_SECRET;else process.env.DAYBOOK_LINK_SECRET=before;}
});
