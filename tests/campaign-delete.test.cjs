const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const priorTs=require.extensions['.ts'],priorTsx=require.extensions['.tsx'];
const compile=(module,path)=>module._compile(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,path);
require.extensions['.ts']=compile;require.extensions['.tsx']=compile;
const {removeCampaign}=require('../lib/ledger.ts');
const Editor=require('../app/editor.tsx').default;
require.extensions['.ts']=priorTs;require.extensions['.tsx']=priorTsx;

const card={id:'card',name:'測試卡',bank:'測試銀行',closeDay:15,color:'#334155'};
const offer=id=>({id,cardId:card.id,name:id,kind:'reward',period:'month',target:100,rate:3,start:'',end:'',notes:''});
const entry={id:'entry',cardId:card.id,date:'2026-11-01',amount:150,note:'保留的消費',campaignIds:['remove','keep'],reward:4.5};

test('deleting an activity preserves spending and every other activity link',()=>{
 const data={cards:[card],campaigns:[offer('remove'),offer('keep')],entries:[entry,{...entry,id:'unrelated',campaignIds:['keep']}]};
 const before=structuredClone(data),next=removeCampaign(data,'remove');
 assert.deepEqual(data,before);
 assert.equal(next.cards,data.cards);assert.equal(next.entries.length,data.entries.length);
 assert.deepEqual(next.campaigns,[data.campaigns[1]]);
 assert.deepEqual(next.entries[0],{...entry,campaignIds:['keep']});
 assert.equal(next.entries[1],data.entries[1]);
 assert.deepEqual(removeCampaign(next,'missing'),next);
});

const props={cards:[card],campaigns:[offer('existing')],busy:false,syncing:false,error:'',conflict:false,onSync:async()=>{},onClose:()=>{},onSubmit:()=>{},onDelete:async()=>{}};
const render=modal=>renderToStaticMarkup(React.createElement(Editor,{...props,modal}));
test('delete is only available for an existing activity and cannot submit the form',()=>{
 const html=render({type:'campaign',value:offer('existing')});
 const button=html.match(/<button\b[^>]*class="editor-delete"[^>]*>/)?.[0];
 assert(button);assert.match(button,/type="button"/);assert(!button.includes('disabled'));
 for(const modal of [{type:'campaign'},{type:'campaign',value:offer('existing'),isNew:true},{type:'card',value:card},{type:'entry',value:entry}])assert(!render(modal).includes('class="editor-delete"'));
});
test('activity deletion is disabled during a cloud write',()=>{
 const html=renderToStaticMarkup(React.createElement(Editor,{...props,busy:true,modal:{type:'campaign',value:offer('existing')}}));
 assert.match(html,/<button\b[^>]*class="editor-delete"[^>]*disabled/);
});
