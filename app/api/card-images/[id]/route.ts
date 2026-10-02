import {eq} from 'drizzle-orm';
import {drizzle} from 'drizzle-orm/neon-http';
import {database} from '../../../../lib/db';
import {cardImages} from '../../../../db/schema';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id))return new Response(null,{status:404});
 try{
  const [image]=await drizzle(database()).select().from(cardImages).where(eq(cardImages.id,id)).limit(1);
  if(!image)return new Response(null,{status:404});
  return new Response(Buffer.from(image.imageData,'base64'),{headers:{'Content-Type':image.mimeType,'Content-Length':String(Buffer.byteLength(image.imageData,'base64')),'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable'}});
 }catch(e){console.error(e);return new Response(null,{status:503});}
}
