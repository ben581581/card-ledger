const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const previous=require.extensions['.ts'];
require.extensions['.ts']=(module,path)=>module._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path);
const {advise,adviseCard,impact,suggestCampaigns}=require('../lib/advise.ts');
const {channelMatches,channelTerms,generalScope,isOverseas}=require('../lib/channels.ts');
const {trackedRows,summarize,pace,resetsOn}=require('../lib/insights.ts');
const {indexEntriesByCampaign}=require('../lib/entry-index.ts');
const {progress}=require('../lib/ledger.ts');
require.extensions['.ts']=previous;

const on='2026-11-05';
const card=(id,extra={})=>({id,name:id,bank:'',closeDay:15,color:'#334155',...extra});
const reward=(id,cardId,rate,target,channels,extra={})=>({id,cardId,name:id,kind:'reward',period:'month',target,rate,start:'',end:'',notes:'',channels,...extra});
const flat=(id,cardId,rate,channels,extra={})=>({id,cardId,name:id,kind:'unlimited',period:'month',target:0,rate,start:'',end:'',notes:'',channels,...extra});
const entry=(id,cardId,amount,campaignIds,date='2026-11-02')=>({id,cardId,date,amount,note:'',campaignIds,reward:null});

test('money past the cap is reported as over, never as earned',()=>{
 const c=reward('x','a',5,100,[]);
 const p=progress(c,card('a'),[entry('1','a',3000,['x'])],on);
 assert.equal(p.value,150);assert.equal(p.earned,100);assert.equal(p.over,1000);assert.equal(p.remaining,0);
 const s=summarize(trackedRows({cards:[card('a')],campaigns:[c],entries:[entry('1','a',3000,['x'])]},on));
 assert.equal(s.earned,100);assert.equal(s.capTotal,100);assert.equal(s.rewardRoom,0);assert.equal(s.over,1000);
});

test('reward room adds up across overlapping campaigns',()=>{
 const data={cards:[card('a')],campaigns:[reward('x','a',3,300,['蝦皮']),reward('y','a',1,50,[])],entries:[entry('1','a',1000,['x','y'])]};
 const s=summarize(trackedRows(data,on));
 // x: 300 cap - 30 earned; y: 50 cap - 10 earned.
 assert.equal(s.rewardRoom,310);assert.equal(s.earned,40);
});

test('aliases reach merchants, categories and trip destinations',()=>{
 assert.ok(channelMatches('ChatGPT','gpt'));
 assert.ok(channelMatches('日韓泰實體','日本'));
 assert.ok(channelMatches('日韓泰實體','泰國'));
 assert.ok(channelMatches('國內網購','蝦皮'));
 assert.ok(channelMatches('Uber Eats','外送'));
 assert.ok(channelMatches('統一超商','7-11'));
 assert.ok(channelTerms('蝦皮麥當勞').includes('shopee'));
 assert.ok(!channelMatches('蝦皮','全聯'));
 assert.ok(isOverseas('10/6-8日本'));assert.ok(!isOverseas('全聯'));
});

test('everyday wording is treated as a general offer with the right reach',()=>{
 assert.equal(generalScope([]),'all');
 assert.equal(generalScope(['一般消費 (不含保費)｜1.2%','海外實體消費']),'all');
 assert.equal(generalScope(['國內一般消費','其他海外一般消費']),'all');
 assert.equal(generalScope(['國內一般消費']),'domestic');
 assert.equal(generalScope(['日本（一般消費）']),null);
 assert.equal(generalScope(['蝦皮']),null);
});

test('a card stacks capped add-ons but picks one flat plan',()=>{
 const data={campaigns:[flat('plan-a','a',3.3,['蝦皮']),flat('plan-b','a',2,['蝦皮']),reward('extra','a',2,100,['蝦皮'])]};
 const a=adviseCard(card('a'),data,'蝦皮',1000,on,new Map());
 assert.equal(a.gain,53);assert.equal(a.rate,5.3);
 assert.deepEqual(a.parts.map(p=>p.c.id),['plan-a','extra']);
});

test('a used-up cap stops paying and drops the card down the ranking',()=>{
 const data={cards:[card('a'),card('b')],campaigns:[reward('rich','a',9,500,['蝦皮']),reward('poor','b',3,300,['蝦皮'])],entries:[entry('1','a',6000,['rich'])]};
 const ranked=advise(data,'蝦皮',1000,on);
 assert.deepEqual(ranked.map(r=>r.card.id),['b','a']);
 assert.equal(ranked[1].gain,0);assert.ok(ranked[1].parts[0].full);
});

test('a purchase bigger than the room left only earns up to the cap',()=>{
 const data={cards:[card('a')],campaigns:[reward('x','a',10,100,['蝦皮'])],entries:[entry('1','a',500,['x'])]};
 const [top]=advise(data,'蝦皮',2000,on);
 assert.equal(top.gain,50);assert.equal(top.rate,2.5);
 const [hit]=impact(data,data.cards[0],['x'],2000,on,indexEntriesByCampaign(data.entries));
 assert.equal(hit.lost,1500);assert.equal(hit.after,100);
});

test('editing a purchase does not count it twice in the preview',()=>{
 const data={cards:[card('a')],campaigns:[reward('x','a',10,100,[])],entries:[entry('1','a',500,['x'])]};
 const [hit]=impact(data,data.cards[0],['x'],500,on,indexEntriesByCampaign(data.entries),'1');
 assert.equal(hit.before,0);assert.equal(hit.after,50);
});

test('conditional offers surface as extras and never inflate the rate',()=>{
 const data={campaigns:[flat('base','a',1,[]),reward('maybe','a',12,350,['國內餐廳'],{queryOnly:true}),{...reward('goal','a',0,30000,['國內餐廳']),kind:'spend'}]};
 const a=adviseCard(card('a'),data,'國內餐廳',1000,on,new Map());
 assert.equal(a.rate,1);assert.deepEqual(a.extras.map(c=>c.id),['maybe','goal']);
});

test('lookup cards compare at face value without touching progress',()=>{
 const data={cards:[card('l',{lookupOnly:true})],campaigns:[flat('p','l',3.3,['蝦皮'],{rateLabel:'3.3–10%'})],entries:[]};
 const [top]=advise(data,'蝦皮',null,on);
 assert.equal(top.rate,3.3);assert.equal(top.gain,null);assert.equal(top.label,'3.3–10%');
});

test('registration-gated bonuses on lookup cards stay out of the rate',()=>{
 const required={registration:{type:'required',label:'需登錄',details:''}};
 const data={campaigns:[flat('base','l',3,['日本（一般消費）']),reward('transit','l',7,200,['日本交通卡'],required),reward('stores','l',3,1000,['日本實體'],required)]};
 const a=adviseCard(card('l',{lookupOnly:true}),data,'日本',1000,on,new Map());
 assert.equal(a.rate,3);assert.deepEqual(a.extras.map(c=>c.id),['transit','stores']);
 const tracked=adviseCard(card('l'),{campaigns:[reward('stores','l',3,1000,['日本實體'],required)]},'日本',1000,on,new Map());
 assert.equal(tracked.rate,3);assert.equal(tracked.extras.length,0);
});

test('out of period campaigns are ignored',()=>{
 const data={cards:[card('a')],campaigns:[reward('old','a',9,500,['蝦皮'],{period:'custom',start:'2026-01-01',end:'2026-01-31'})],entries:[]};
 assert.deepEqual(advise(data,'蝦皮',100,on),[]);
});

test('a recognised merchant selects only its offers plus the everyday rate',()=>{
 const data={cards:[card('a')],campaigns:[reward('base','a',1,50,[]),reward('shop','a',3,300,['蝦皮']),reward('gym','a',3,300,['World Gym']),{...reward('jp','a',0,20000,['日韓泰實體']),kind:'spend'}]};
 assert.deepEqual(suggestCampaigns(data,'a','蝦皮',on),{ids:['shop','base'],matched:true});
 assert.deepEqual(suggestCampaigns(data,'a','10/6 日本',on).ids.sort(),['base','jp']);
});

test('an unknown note keeps everything selected, as the person chose the card on purpose',()=>{
 const data={cards:[card('a')],campaigns:[reward('base','a',1,50,[]),reward('shop','a',3,300,['蝦皮'])]};
 assert.deepEqual(suggestCampaigns(data,'a','保鮮膜',on),{ids:['base','shop'],matched:false});
 assert.deepEqual(suggestCampaigns(data,'a','',on),{ids:['base','shop'],matched:false});
});

test('query-only and untracked campaigns are never preselected',()=>{
 const data={cards:[card('a')],campaigns:[reward('q','a',5,100,['蝦皮'],{queryOnly:true}),flat('f','a',1,[])]};
 assert.deepEqual(suggestCampaigns(data,'a','蝦皮',on).ids,[]);
});

test('pace warns before a cap runs out and spreads the rest of a goal',()=>{
 const rows=trackedRows({cards:[card('a')],campaigns:[reward('x','a',10,100,[]),{...reward('g','a',0,3000,[]),kind:'spend'}],entries:[entry('1','a',500,['x'],'2026-11-01'),entry('2','a',600,['g'],'2026-11-02')]},on);
 const cap=rows.find(r=>r.c.id==='x'),goal=rows.find(r=>r.c.id==='g');
 assert.deepEqual(pace(cap,on),{kind:'cap',date:'2026-11-10'});
 assert.deepEqual(pace(goal,on),{kind:'goal',perDay:93});
 assert.equal(resetsOn(cap),'2026-12-01');
});
