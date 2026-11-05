const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const previous=require.extensions['.ts'];
require.extensions['.ts']=(module,path)=>module._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path);
const {betterAtMerchant,catalogAdvice,catalogToLedger,faceColors,heldCard,perkActive,whatIf}=require('../lib/catalog.ts');
const {suggestCampaigns}=require('../lib/advise.ts');
require.extensions['.ts']=previous;
const {cards:catalog}=require('../lib/catalog-data.json');

const on='2026-11-05';
const entry=(extra={})=>({id:'x',name:'X',bank:'銀行',hue:200,domestic:1,overseas:2,fee:0,waiver:'',fxFee:1.5,tags:[],unit:'現金',summary:'',url:'https://example.com',perks:[],...extra});
const perk=(extra={})=>({name:'網購',rate:5,channels:['網購'],start:'',end:'',...extra});

test('the catalog is well formed and every card links to a bank page',()=>{
 assert.ok(catalog.length>=45);
 assert.equal(new Set(catalog.map(c=>c.id)).size,catalog.length);
 for(const c of catalog){
  assert.match(c.url,/^https:\/\//,c.id);
  assert.ok(c.fee>=0&&c.fxFee>=0&&c.fxFee<=3,c.id);
  assert.ok(['official','partial','listing'].includes(c.verified),c.id);
  if(c.miles)continue;
  assert.ok(c.domestic>0||c.perks.length>0,c.id);
  for(const p of c.perks){
   assert.ok(p.rate>0&&p.channels.length>0,`${c.id} ${p.name}`);
   if(p.cap)assert.ok(p.capPeriod,`${c.id} ${p.name}`);
   if(p.start&&p.end)assert.ok(p.start<=p.end,`${c.id} ${p.name}`);
  }
 }
});

test('rates read off bank pages stay put',()=>{
 const byId=id=>catalog.find(c=>c.id===id);
 assert.equal(byId('ctbc-linepay').overseas,2.8);
 assert.equal(byId('yuanta-diamond-easycard').domestic,1.2);
 assert.equal(byId('mega-one').overseas,2.88);
 assert.equal(byId('mega-one').fee,0);
 assert.equal(byId('cathay-shopee').fxFee,0);
 assert.equal(byId('cathay-cube').perks.find(p=>p.name.startsWith('玩數位')).rate,3);
 assert.equal(catalogAdvice(byId('hsbc-liveplus'),'蝦皮',1000,on).rate,3.88);
 // JPY base 2.5% plus the registered mobile-pay add-on; store add-ons need a store name.
 assert.equal(catalogAdvice(byId('ubot-jiho'),'日本',1000,on).rate,4);
 assert.equal(catalogAdvice(byId('ubot-jiho'),'日本唐吉訶德',1000,on).rate,7);
 assert.equal(catalogAdvice(byId('ubot-linebank'),'蝦皮',1000,on).rate,4);
 assert.equal(catalogAdvice(byId('rakuten-panda-j'),'日本',1000,on).rate,4);
});

test('a catalog card takes its best rate, stacks add-ons and falls back past a cap',()=>{
 const c=entry({perks:[perk({rate:5,cap:100,capPeriod:'month'}),perk({name:'加碼',rate:1,addon:true,cap:50,capPeriod:'month'})]});
 assert.equal(catalogAdvice(c,'蝦皮',1000,on).gain,60);
 const budget=new Map();
 catalogAdvice(c,'蝦皮',2000,on,budget).charge();
 const next=catalogAdvice(c,'蝦皮',1000,on,budget);
 // The 5% cap is gone, so 1% base plus the 1% add-on remain.
 assert.equal(next.gain,20);assert.equal(next.perks.length,1);
});

test('a shared pool is drawn down by every perk in it',()=>{
 const c=entry({domestic:0.88,perks:[perk({name:'餐飲',rate:3,addon:true,cap:88,capPeriod:'bill',pool:'p',channels:['餐飲']}),perk({name:'購物',rate:3,addon:true,cap:88,capPeriod:'bill',pool:'p',channels:['網購']})]});
 const budget=new Map();
 catalogAdvice(c,'麥當勞',10000,on,budget).charge();
 assert.equal(catalogAdvice(c,'蝦皮',1000,on,budget).gain,8.8);
});

test('overseas spending uses the overseas base and expired perks stop counting',()=>{
 const c=entry({perks:[perk({end:'2026-10-31',channels:['日本']})]});
 assert.equal(catalogAdvice(c,'日本',1000,on).rate,2);
 assert.ok(!perkActive(c.perks[0],on));
});

test('held cards are recognised by catalog id or by bank and name',()=>{
 const cube=catalog.find(c=>c.id==='cathay-cube');
 assert.ok(heldCard(cube,[{id:'a',name:'CUBE',bank:'國泰世華銀行',closeDay:15,color:'#000000'}]));
 assert.ok(!heldCard(cube,[{id:'a',name:'CUBE',bank:'玉山銀行',closeDay:15,color:'#000000'}]));
 assert.ok(heldCard(entry(),[{id:'a',name:'別名',bank:'',closeDay:15,color:'#000000',catalogId:'x'}]));
});

test('only cards that beat the current best at a merchant are suggested',()=>{
 const good=entry({id:'good',perks:[perk({rate:6})]}),weak=entry({id:'weak',perks:[perk({rate:2})]}),base=entry({id:'base',domestic:7}),miles=entry({id:'miles',miles:'x',perks:[perk({rate:20})]});
 assert.deepEqual(betterAtMerchant([good,weak,base,miles],[],'蝦皮',3,on).map(x=>x.entry.id),['good']);
 assert.deepEqual(betterAtMerchant([good],[],'',3,on),[]);
});

test('what-if replays purchases, keeps the better payout and respects caps',()=>{
 const data={cards:[{id:'a',name:'A',bank:'',closeDay:15,color:'#000000'}],
  campaigns:[{id:'c',cardId:'a',name:'c',kind:'reward',period:'month',target:1000,rate:2,start:'',end:'',notes:''}],
  entries:[
   {id:'1',cardId:'a',date:'2026-10-10',amount:1000,note:'蝦皮',campaignIds:['c'],reward:null},
   {id:'2',cardId:'a',date:'2026-10-11',amount:5000,note:'蝦皮',campaignIds:['c'],reward:null},
   {id:'3',cardId:'a',date:'2026-10-12',amount:1000,note:'未知店家',campaignIds:['c'],reward:null},
  ]};
 const result=whatIf(entry({domestic:0.5,perks:[perk({rate:5,cap:100,capPeriod:'month'})]}),data,on);
 // Kept: 20 → 50 and 100 → 100 at the cap; the third stays at 20 instead of 5.
 assert.equal(result.have,140);assert.equal(result.would,170);assert.equal(result.uplift,30);
 assert.equal(result.wins,1);assert.equal(result.days,30);assert.equal(result.annual,365);
 // One month and one winning purchase is not a yearly figure.
 assert.equal(result.reliable,false);
 assert.equal(whatIf(entry({miles:'x'}),data,on),null);
 assert.equal(whatIf(entry(),{...data,entries:[]},on),null);
});

test('threshold offers count as money already earned',()=>{
 const data={cards:[{id:'a',name:'A',bank:'',closeDay:15,color:'#000000'}],
  campaigns:[{id:'g',cardId:'a',name:'g',kind:'spend',period:'quarter',target:20000,rate:3,start:'',end:'',notes:''}],
  entries:[{id:'1',cardId:'a',date:'2026-10-10',amount:20000,note:'日本',campaignIds:['g'],reward:null}]};
 const result=whatIf(entry({overseas:2}),data,on);
 assert.equal(result.have,600);assert.equal(result.uplift,0);assert.equal(result.wins,0);
});

test('adding a catalog card creates tracked caps and lookup offers that count purchases',()=>{
 let n=0;
 const c=entry({domestic:1,overseas:2,perks:[perk({name:'網購',rate:5,cap:100,capPeriod:'bill'}),perk({name:'無上限',rate:3,channels:['餐飲']}),perk({name:'過期',rate:9,end:'2026-01-01'})]});
 const {card,campaigns}=catalogToLedger(c,()=>`id-${++n}`,20,false,on);
 assert.equal(card.closeDay,20);assert.equal(card.catalogId,'x');assert.equal(card.lookupOnly,false);
 assert.deepEqual(campaigns.map(x=>[x.name,x.kind,x.period,x.target]),[['國內一般消費','unlimited','month',0],['海外一般消費','unlimited','month',0],['網購','reward','bill',100],['無上限','unlimited','month',0]]);
 assert.deepEqual(suggestCampaigns({cards:[card],campaigns},card.id,'蝦皮',on).ids,[campaigns[2].id]);
});

test('card face colours are valid hex for every bank hue',()=>{
 for(const c of catalog)for(const value of faceColors(c.hue))assert.match(value,/^#[0-9a-f]{6}$/);
});
