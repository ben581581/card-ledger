const {test}=require('node:test');
const assert=require('node:assert/strict');
const {groupCampaigns}=require('../lib/group-campaigns.ts');

const card=id=>({id,name:'同名卡',bank:'測試銀行',closeDay:15,color:'#334155'});
const a=card('a'),b=card('b'),c=card('c');
function row(card,id,percent,{active=true,remaining=100,end='2026-10-31',campaignEnd='2027-12-31'}={}){
 return {card,c:{id,cardId:card.id,name:id,kind:'reward',period:'month',rate:1,target:100,start:'',end:campaignEnd,notes:''},p:{active,percent,remaining,start:'2026-10-01',end,spend:percent,value:percent,spendLimit:10000,spendRemaining:remaining*100}};
}
const names=groups=>groups.map(group=>[group.card.id,group.rows.map(row=>row.c.id)]);

test('same-card activities stay together; unfinished progress determines both orders',()=>{
 const rows=[row(a,'a-low',30),row(b,'b-low',10),row(a,'a-high',85),row(c,'c-high',96),row(b,'b-high',90)];
 assert.deepEqual(names(groupCampaigns(rows,[a,b,c])),[['c',['c-high']],['b',['b-high','b-low']],['a',['a-high','a-low']]]);
});

test('completed or inactive 100% cannot push a group ahead of unfinished activities',()=>{
 const rows=[row(a,'a-finished',100,{remaining:0}),row(a,'a-current',20),row(b,'b-current',80),row(c,'c-expired',100,{active:false,remaining:0})];
 assert.deepEqual(names(groupCampaigns(rows,[a,b,c])),[['b',['b-current']],['a',['a-current','a-finished']],['c',['c-expired']]]);
});

test('a rounded display of 100% is still unfinished when a remaining balance exists',()=>{
 const rows=[row(a,'complete',100,{remaining:0}),row(b,'almost',99.6,{remaining:.4}),row(c,'low',1)];
 assert.deepEqual(groupCampaigns(rows,[a,b,c]).map(group=>group.card.id),['b','c','a']);
});

test('ties use the current period end, then card order and original activity order',()=>{
 const rows=[row(b,'b',0,{end:'2026-11-21',campaignEnd:'2026-10-31'}),row(a,'a-first',0,{end:'2026-10-31'}),row(c,'c',0,{end:'2026-10-31'}),row(a,'a-second',0,{end:'2026-10-31'})];
 assert.deepEqual(names(groupCampaigns(rows,[c,a,b])),[['c',['c']],['a',['a-first','a-second']],['b',['b']]]);
});

test('each group keeps completed rows before inactive rows',()=>{
 const rows=[row(a,'ended',99,{active:false}),row(a,'complete',100,{remaining:0}),row(a,'current',0),row(a,'future',0,{active:false})];
 assert.deepEqual(names(groupCampaigns(rows,[a])),[['a',['current','complete','ended','future']]]);
});

test('sorting is non-mutating, preserves row references, and handles filters or no rows',()=>{
 const rows=[row(a,'low',10),row(b,'high',90),row(a,'high',80)];
 const original=structuredClone(rows);
 for(const value of rows){Object.freeze(value.c);Object.freeze(value.p);Object.freeze(value.card);Object.freeze(value);}Object.freeze(rows);
 const groups=groupCampaigns(rows,[a,b]);
 assert.deepEqual(rows,original);
 assert.equal(groups[0].rows[0],rows[1]);
 assert.deepEqual(names(groupCampaigns(rows.filter(x=>x.card.id==='a'),[a,b])),[['a',['high','low']]]);
 assert.deepEqual(groupCampaigns([],[a,b]),[]);
});
