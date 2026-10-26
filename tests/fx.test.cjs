const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
// Compile the real TypeScript modules without adding a test runtime dependency.
const previous=require.extensions['.ts'];
require.extensions['.ts']=(module,path)=>module._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path);
const {parseFxPage}=require('../lib/fx-source.ts');
const {estimateFx,fxInput,fxDateAge,usableFxQuote,canEstimateFx,emptyFx,freshFxSnapshot}=require('../lib/fx.ts');
require.extensions['.ts']=previous;
const now=new Date('2026-10-26T02:00:00Z');
const row=(network,rate,date='2026-10-25',currency='JPY')=>`<tr><td><span>${network}</span></td><td><span>${rate}</span>&nbsp;<span>(${date})</span></td><td>1000 ${currency}</td><td></td><td></td><td>計算中... TWD</td></tr>`;
const page=(rows,currency='JPY')=>`<span class="headline-rate-unit">TWD / ${currency}</span><table id="table_comparison"><tbody>${rows}</tbody></table>`;

test('extracts independent network dates and never evaluates remote scripts',()=>{
  const data=parseFxPage(page(row('JCB','.21')+row('萬事達','.211')+row('VISA','.212','2026-10-26'))+'<script>throw Error("remote script executed")</script>','JPY',now);
  assert.deepEqual(data.quotes,[{network:'visa',rate:.212,date:'2026-10-26'},{network:'mastercard',rate:.211,date:'2026-10-25'},{network:'jcb',rate:.21,date:'2026-10-25'}]);
  assert.equal(data.base,'TWD');assert.equal(data.fetchedAt,now.toISOString());
});
test('parses five requested currencies with a consistent TWD per foreign-unit direction',()=>{
  for(const [currency,rate] of [['JPY',.2],['USD',32],['VND',.0012],['THB',.98],['EUR',37]]){
    const result=parseFxPage(page(row('VISA',rate,'2026-10-25',currency),currency),currency,now);
    assert.equal(result.currency,currency);assert.equal(result.quotes[0].rate,rate);
  }
});
test('preserves extra calculator precision only when it agrees with the visible Visa rate',()=>{
  const html=page(row('VISA','.00126','2026-10-25','VND'),'VND');
  const result=parseFxPage(html+'<script>var to_amt = 0.0012600039 * amt_value;</script>','VND',now);
  assert.equal(result.quotes[0].rate,.0012600039);
  assert.throws(()=>parseFxPage(html+'<script>var to_amt = 0.01 * amt_value;</script>','VND',now));
});
test('missing, invalid, future, impossible or wrong-currency quotes stay unavailable',()=>{
  const rows=row('VISA','.2')+row('JCB','9999999')+row('萬事達','.21','2026-10-27');
  const result=parseFxPage(page(rows),'JPY',now);
  assert.equal(result.quotes.filter(usableFxQuote).length,1);
  assert.equal(result.quotes[1].rate,null);assert.equal(result.quotes[2].rate,null);
  assert.throws(()=>parseFxPage(page(row('JCB','.2','2026-02-30')),'JPY',now));
  assert.throws(()=>parseFxPage(page(row('JCB','.2','2026-08-01')),'JPY',now));
  assert.throws(()=>parseFxPage(page(row('JCB','.2','2026-10-25','USD')),'JPY',now));
  assert.throws(()=>parseFxPage(page(row('JCB','800','2026-10-25','VND'),'VND'),'VND',now));
});
test('rejects a changed layout, direction, oversized response and duplicate networks',()=>{
  assert.throws(()=>parseFxPage('<html>challenge</html>','JPY',now));
  assert.throws(()=>parseFxPage(page(row('JCB','.2')).replace('TWD / JPY','JPY / TWD'),'JPY',now));
  assert.throws(()=>parseFxPage(page(row('JCB','.2')+row('JCB','.3')),'JPY',now));
  assert.throws(()=>parseFxPage('x'.repeat(524289),'JPY',now));
});
test('money and fee calculation preserves displayed subtotals and supports zero fee',()=>{
  assert.deepEqual(estimateFx(10000,.20882973,1.5),{base:2088.3,fee:31.32,total:2119.62});
  assert.deepEqual(estimateFx(1000000,.00126226,0),{base:1262.26,fee:0,total:1262.26});
  assert.deepEqual(estimateFx(0,.2,1.5),{base:0,fee:0,total:0});
  const estimate=estimateFx(.1,.25,20);assert.equal(Math.round(estimate.total*100),Math.round(estimate.base*100)+Math.round(estimate.fee*100));
  for(const args of [[1,0,1.5],[1,.2,-1],[1,.2,21],[Infinity,.2,1.5],[-1,.2,0],[Number.MAX_VALUE,1,20]])assert.equal(estimateFx(...args),null);
});
test('amount validation accepts grouped money but rejects coercions and malformed numbers',()=>{
  assert.equal(fxInput('1,000,000',1e10),1e6);assert.equal(fxInput(' 12.50 ',1e10),12.5);assert.equal(fxInput('0',20),0);
  for(const value of ['', ' ', '-1', 'NaN', 'Infinity', '1e3', '1,00', '0x10', '1.234', '20.01'])assert.equal(fxInput(value,20),null);
});
test('freshness uses the Taiwan calendar day and rejects invalid calendar dates',()=>{
  assert.equal(fxDateAge('2026-10-26',new Date('2026-10-25T16:01:00Z')),0);
  assert.equal(fxDateAge('2026-10-25',now),1);
  assert.equal(usableFxQuote({network:'visa',rate:.2,date:'2026-02-30'}),false);
});
test('expired snapshots and over-seven-day quotes never produce a current estimate',()=>{
  const snapshot={...emptyFx('JPY'),fetchedAt:now.toISOString()},quote={network:'visa',rate:.2,date:'2026-10-25'};
  assert.equal(canEstimateFx(quote,snapshot,now),true);
  assert.equal(canEstimateFx({...quote,date:'2026-10-18'},snapshot,now),false);
  assert.equal(canEstimateFx({...quote,date:'2026-10-27'},snapshot,now),false);
  assert.equal(canEstimateFx(quote,{...snapshot,fetchedAt:'2026-10-24T01:59:59Z'},now),false);
  assert.equal(freshFxSnapshot({...snapshot,fetchedAt:'2026-10-27T02:00:00Z'},now),false);
  assert.equal(freshFxSnapshot(emptyFx('JPY'),now),false);
});
