import {randomUUID} from 'node:crypto';
import {drizzle} from 'drizzle-orm/neon-http';
import {database} from '../../../lib/db';
import {cardImages} from '../../../db/schema';
import {imageMime,maxImageBytes} from '../../../lib/uploaded-images';
export const runtime='nodejs';
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'來源不符'},{status:403});
 try{
  if(Number(request.headers.get('content-length'))>maxImageBytes)return Response.json({error:'圖片太大，請換一張較小的圖片。'},{status:413});
  const bytes=new Uint8Array(await request.arrayBuffer());
  if(bytes.length>maxImageBytes)return Response.json({error:'圖片太大，請換一張較小的圖片。'},{status:413});
  const mime=imageMime(bytes);
  if(!mime||request.headers.get('content-type')!==mime)return Response.json({error:'請選擇 JPG、PNG 或 WebP 圖片。'},{status:400});
  const id=randomUUID();
  await drizzle(database()).insert(cardImages).values({id,mimeType:mime,imageData:Buffer.from(bytes).toString('base64')});
  return Response.json({url:`/api/card-images/${id}`},{status:201});
 }catch(e){console.error(e);return Response.json({error:'圖片上傳失敗，請重試。'},{status:503});}
}
