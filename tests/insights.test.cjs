const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const previous=require.extensions['.ts'];
require.extensions['.ts']=(module,path)=>module._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path);
const {trackedRows,summarize,daysLeft,rankOffers,statusOf}=require('../lib/insights.ts');
require.extensions['.ts']=previous;

const card={id:'a',name:'A',bank:'',closeDay:15,color:'#334155'};
const lookup={id:'l',name:'L',bank:'',closeDay:15,color:'#334155',lookupOnly:true};
const camp=(id,extra={})=>({id,cardId:'a',name:id,kind:'reward',period:'month',target:100,rate:5,start:'',end:'',notes:'',...extra});
const entry=(id,amount,ids,date='2026-11-02')=>({id,cardId:'a',date,amount,note:'',campaignIds:ids,reward:null});
const on='2026-11-03';

test('days left counts the viewed day and is open-ended without an end date',()=>{
 assert.equal(daysLeft('2026-11-30',on),28);
 assert.equal(daysLeft('2026-11-03',on),1);
 assert.equal(daysLeft('',on),Infinity);
});

test('rows are ordered by attention: near cap, open, full, then off-period',()=>{
 const data={cards:[card,lookup],campaigns:[camp('full'),camp('open'),camp('near'),camp('past',{period:'custom',start:'2026-01-01',end:'2026-01-31'}),camp('lookup',{cardId:'l'}),camp('free',{kind:'unlimited'})],
  entries:[entry('1',2000,['full']),entry('2',400,['open']),entry('3',1700,['near'])]};
 const rows=trackedRows(data,on);
 assert.deepEqual(rows.map(r=>[r.c.id,r.status]),[['near','near'],['open','open'],['full','full'],['past','ended']]);
 const s=summarize(rows);
 assert.equal(s.near,1);assert.equal(s.full,1);assert.equal(s.rewards,3);
 // open: 100-20 = 80 reward left / 5% = 1600; near: 100-85 = 15 / 5% = 300.
 assert.equal(s.capRoom,1900);
 assert.equal(s.earned,205);
});

test('a reward campaign without a rate cannot be converted and is flagged',()=>{
 const data={cards:[card],campaigns:[camp('x',{rate:0})],entries:[]};
 assert.equal(trackedRows(data,on)[0].status,'unset');
 assert.equal(statusOf({active:false,start:'2026-12-01',end:'2026-12-31'},on),'upcoming');
});

test('channel ranking prefers usable capacity, then the higher rate',()=>{
 const b={...card,id:'b',name:'B'};
 const data={cards:[card,b,lookup],campaigns:[
  camp('a-full',{rate:10,channels:['蝦皮']}),
  camp('b-open',{cardId:'b',rate:3,channels:['Shopee']}),
  camp('l-free',{cardId:'l',kind:'unlimited',rate:4,channels:['蝦皮購物']}),
  camp('a-goal',{kind:'spend',target:5000,rate:0,channels:['蝦皮']}),
 ],entries:[entry('1',1000,['a-full'])]};
 const ranked=rankOffers(data,'蝦皮',on);
 assert.deepEqual(ranked.map(o=>o.c.id),['l-free','b-open','a-goal','a-full']);
 assert.equal(ranked.at(-1).usable,false);
});
