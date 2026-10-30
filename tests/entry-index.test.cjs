const {test}=require('node:test');
const assert=require('node:assert/strict');
const {indexEntriesByCampaign}=require('../lib/entry-index.ts');
const {progress}=require('../lib/ledger.ts');

const card={id:'a',name:'測試',bank:'',closeDay:31,color:'#334155'};
const campaign={id:'cap',cardId:'a',name:'回饋',kind:'reward',period:'month',target:100,rate:3,start:'',end:'',notes:''};
const entry=(id,date,amount,extra={})=>({id,cardId:'a',date,amount,note:'',campaignIds:['cap'],reward:null,...extra});
const entries=[entry('one','2026-10-01',100.15),entry('two','2026-10-31',200,{reward:9}),entry('before','2026-09-30',900),entry('other-card','2026-10-15',900,{cardId:'b'}),entry('duplicates','2026-10-15',.25,{campaignIds:['cap','cap','other']}),entry('none','2026-10-15',900,{campaignIds:[]})];

test('index keeps entry order and references without double-counting repeated activity ids',()=>{
 const before=structuredClone(entries),index=indexEntriesByCampaign(entries);
 assert.deepEqual(index.get('cap').map(row=>row.id),['one','two','before','other-card','duplicates']);
 assert.equal(index.get('cap')[0],entries[0]);
 assert.equal(index.get('other')[0],entries[4]);
 assert.deepEqual(entries,before);
 assert.equal(indexEntriesByCampaign([]).size,0);
});

test('indexed progress equals full-ledger progress across periods, caps and actual rewards',()=>{
 const index=indexEntriesByCampaign(entries);
 for(const period of ['month','bill','quarter','custom']){
  for(const kind of ['reward','spend','unlimited']){
   for(const queryOnly of [false,true]){
    const offer={...campaign,kind,period,queryOnly,start:'2026-01-01',end:'2026-12-31'};
    for(const on of ['2026-10-01','2026-10-31','2026-11-01'])assert.deepEqual(progress(offer,card,index.get(offer.id)||[],on),progress(offer,card,entries,on));
   }
  }
 }
 assert.deepEqual(progress({...campaign,id:'missing'},card,[], '2026-10-31'),progress({...campaign,id:'missing'},card,entries,'2026-10-31'));
});
