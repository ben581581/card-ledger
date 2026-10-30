const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const previous=require.extensions['.ts'];
require.extensions['.ts']=(module,path)=>module._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,path);
const {channelMatches,searchChannels,featuredChannels}=require('../lib/channels.ts');
require.extensions['.ts']=previous;

const card=id=>({id,name:id,bank:'測試',closeDay:15,color:'#334155'});
const offer=(id,cardId,channels,extra={})=>({id,cardId,name:id,kind:'reward',period:'month',target:100,rate:2,start:'2026-01-01',end:'2026-12-31',notes:'',channels,...extra});
const data={cards:[card('a'),card('b')],campaigns:[offer('one','a',[' Shopee 購物','MOMO']),offer('two','b',['蝦皮購物']),offer('ended','b',['Shopee'],{end:'2026-09-30'}),offer('lookup','a',['全聯'],{queryOnly:true})],entries:[{id:'e',cardId:'a',date:'2026-10-10',amount:1000,note:'',campaignIds:['one'],reward:null}]};

test('matching keeps aliases, normalization, partial and empty queries',()=>{
 for(const [name,query,expected] of [[' Shopee 購物','蝦皮',true],['蝦皮購物','ＳＨＯＰＥＥ',true],['MOMO 購物','mo mo',true],['全聯福利中心','pxmart',true],['momo','',true],['蝦皮','momo',false]])assert.equal(channelMatches(name,query),expected,`${name} / ${query}`);
});
test('search preserves activity status, card order and reward calculation',()=>{
 const current=searchChannels(data,'蝦皮','2026-10-31');
 assert.deepEqual(current.map(row=>row.card.id),['a','b']);
 assert.equal(current[0].matches[0].p.value,20);
 assert.deepEqual(current[1].matches.map(row=>row.c.id),['two']);
 assert.deepEqual(searchChannels(data,'shopee','2026-10-31',true)[1].matches.map(row=>row.c.id),['two','ended']);
 assert.equal(searchChannels(data,'pxmart','2026-10-31')[0].matches[0].p.value,0);
});
test('featured shortcuts count distinct eligible cards',()=>{
 assert.deepEqual(featuredChannels(data,'2026-10-31'),[{channel:'蝦皮',cardCount:2}]);
});
