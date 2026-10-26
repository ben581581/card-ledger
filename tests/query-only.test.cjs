const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const prior=require.extensions['.ts'];
require.extensions['.ts']=(module,path)=>module._compile(compile(path),path);
const {tracksProgress,progress}=require('../lib/ledger.ts');
const {validSnapshot,readLedgerCache,writeLedgerCache}=require('../lib/ledger-cache.ts');
const {searchChannels}=require('../lib/channels.ts');
const route={exports:{}};
vm.runInNewContext(compile('app/api/ledger/route.ts')+'\nmodule.exports.inputSchema=schema;',{
 module:route,exports:route.exports,require:path=>{
  if(path.endsWith('/db'))return {database:()=>{throw Error('Tests must not access a database');}};
  if(path.startsWith('../../../lib/'))return require('../lib/'+path.split('/').at(-1)+'.ts');
  return require(path);
 }
});
require.extensions['.ts']=prior;
const card={id:'test-eco',name:'測試卡',bank:'測試銀行',closeDay:13,color:'#334155'};
const base={id:'c',cardId:card.id,name:'測試權益',kind:'reward',period:'bill',rate:4,target:600,start:'2026-01-01',end:'2026-12-31',notes:'',channels:['測試通路']};
const entry={id:'entry',cardId:card.id,date:'2026-10-20',amount:15000,note:'合成資料',campaignIds:[base.id],reward:null};
test('ordinary caps still track only the bonus rate in the real billing cycle',()=>{
 const p=progress(base,card,[entry],'2026-10-26');
 assert.equal(tracksProgress(base),true);assert.equal(p.start,'2026-10-14');assert.equal(p.end,'2026-11-13');
 assert.equal(p.spendLimit,15000);assert.equal(p.value,600);assert.equal(p.remaining,0);
 const eco=progress({...base,rate:9,target:500},card,[],'2026-10-26');assert.equal(eco.spendLimit,5555.55);
});
test('query-only capped offers never accrue an estimated reward even when selected on an entry',()=>{
 const p=progress({...base,queryOnly:true},card,[entry],'2026-10-26');
 assert.equal(tracksProgress({...base,queryOnly:true}),false);
 assert.equal(p.active,true);assert.equal(p.value,0);assert.equal(p.percent,0);assert.equal(p.spend,0);assert.equal(p.spendRemaining,null);
 assert.equal(progress({...base,queryOnly:true},card,[entry],'2027-01-01').active,false);
});
test('the ledger API validation preserves the optional boolean and rejects malformed values',()=>{
 const data={cards:[card],campaigns:[{...base,queryOnly:true}],entries:[]};
 const result=route.exports.inputSchema.parse({revision:1,data});assert.equal(result.data.campaigns[0].queryOnly,true);
 assert.equal(route.exports.inputSchema.safeParse({revision:1,data:{...data,campaigns:[{...base,queryOnly:'true'}]}}).success,false);
 assert.equal(route.exports.inputSchema.safeParse({revision:1,data:{...data,campaigns:[base]}}).success,true);
});
test('cache roundtrip retains the flag and older snapshots remain compatible',()=>{
 const snapshot={revision:1,updatedAt:null,data:{cards:[card],campaigns:[{...base,queryOnly:true}],entries:[]}};
 let raw='';const storage={setItem:(_key,value)=>{raw=value;},getItem:()=>raw};writeLedgerCache(storage,snapshot);
 assert.deepEqual(readLedgerCache(storage),snapshot);
 assert.equal(validSnapshot({...snapshot,data:{...snapshot.data,campaigns:[base]}}),true);
 assert.equal(validSnapshot({...snapshot,data:{...snapshot.data,campaigns:[{...base,queryOnly:'yes'}]}}),false);
});
test('conditional offers stay searchable while not entering progress tracking',()=>{
 const offer={...base,queryOnly:true};const data={cards:[card],campaigns:[offer],entries:[entry]};
 const found=searchChannels(data,'測試通路','2026-10-26');assert.equal(found.length,1);assert.equal(found[0].matches[0].c.queryOnly,true);
 assert.equal(data.campaigns.filter(tracksProgress).length,0);
 assert.equal(searchChannels(data,'測試通路','2027-01-01').length,0);
});
