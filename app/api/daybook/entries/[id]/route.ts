import {z} from 'zod';
import {changeLedger,linkAuthorized,removeLinked,upsertLinked} from '../../../../../lib/daybook-link';
export const dynamic='force-dynamic';
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!Number.isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s);
const schema=z.object({cardId:z.string().min(1).max(80),date:day,amount:z.number().positive().max(1e10),note:z.string().max(500)}).strict();
const key=z.string().uuid();
type Context={params:Promise<{id:string}>};
const reply=(result:Awaited<ReturnType<typeof changeLedger>>)=>result==='busy'?Response.json({error:'帳簿正在更新，請稍後再試'},{status:409})
 :result==='rejected'?Response.json({error:'找不到這張卡'},{status:422}):Response.json({ok:true});

export async function PUT(request:Request,context:Context){
 if(!linkAuthorized(request))return Response.json({error:'未授權'},{status:401});
 try{
  const {id}=await context.params;
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!key.safeParse(id).success||!parsed.success)return Response.json({error:'資料格式無效'},{status:400});
  return reply(await changeLedger(data=>upsertLinked(data,{id,...parsed.data})));
 }catch(e){console.error(e);return Response.json({error:'儲存失敗'},{status:503});}
}
export async function DELETE(request:Request,context:Context){
 if(!linkAuthorized(request))return Response.json({error:'未授權'},{status:401});
 try{
  const {id}=await context.params;
  if(!key.safeParse(id).success)return Response.json({error:'資料格式無效'},{status:400});
  return reply(await changeLedger(data=>removeLinked(data,id)));
 }catch(e){console.error(e);return Response.json({error:'刪除失敗'},{status:503});}
}
