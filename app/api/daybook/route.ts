import {linkAuthorized,readLedger} from '../../../lib/daybook-link';
export const dynamic='force-dynamic';
/** The cards Daybook may file a purchase under: the ones that track spending. */
export async function GET(request:Request){
 if(!linkAuthorized(request))return Response.json({error:'未授權'},{status:401});
 try{
  const {data}=await readLedger();
  return Response.json({cards:data.cards.filter(c=>!c.lookupOnly).map(c=>({id:c.id,name:c.name,bank:c.bank,color:c.color}))},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error(e);return Response.json({error:'卡片暫時無法讀取'},{status:503});}
}
