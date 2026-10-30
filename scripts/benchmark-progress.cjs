// Synthetic data only. Measures calculation work, not network or full-page loading.
const {performance}=require('node:perf_hooks');
const assert=require('node:assert/strict');
const {progress}=require('../lib/ledger.ts');
const {indexEntriesByCampaign}=require('../lib/entry-index.ts');

const cards=Array.from({length:100},(_,i)=>({id:'card'+i,name:'測試',bank:'',closeDay:15,color:'#334155'}));
const campaigns=Array.from({length:500},(_,i)=>({id:'offer'+i,cardId:cards[Math.floor(i/5)].id,name:'測試活動',kind:'reward',period:'month',target:100,rate:3,start:'',end:'',notes:''}));
const entries=Array.from({length:10000},(_,i)=>({id:'entry'+i,cardId:cards[i%100].id,date:'2026-10-15',amount:100.15,note:'',campaignIds:['offer'+((i%100)*5+i%5)],reward:null}));
const on='2026-10-31';
const fullScan=()=>campaigns.map((c,i)=>progress(c,cards[Math.floor(i/5)],entries,on));
const indexed=()=>{
 const index=indexEntriesByCampaign(entries);
 return campaigns.map((c,i)=>progress(c,cards[Math.floor(i/5)],index.get(c.id)||[],on));
};

function medianMs(run){
 for(let i=0;i<5;i++)run();
 const samples=[];
 for(let i=0;i<25;i++){
  const start=performance.now();run();samples.push(performance.now()-start);
 }
 return samples.sort((a,b)=>a-b)[12];
}

assert.deepEqual(indexed(),fullScan());
console.log(JSON.stringify({cards:cards.length,campaigns:campaigns.length,entries:entries.length,fullScanMs:medianMs(fullScan),indexedMs:medianMs(indexed),resultsMatch:true},null,2));
