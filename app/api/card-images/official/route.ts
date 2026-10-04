import sharp from 'sharp';
import {cardImages,cardImageZoom} from '../../../../lib/card-images';
import {saveCardImage} from '../../../../lib/save-card-image';
import {imageMime,maxImageBytes} from '../../../../lib/uploaded-images';

export const runtime='nodejs';
export const maxDuration=30;
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'來源不符'},{status:403});
 try{
  if(Number(request.headers.get('content-length'))>1000)return Response.json({error:'請重新選擇官方卡面。'},{status:400});
  const body=await request.text();
  if(body.length>1000)return Response.json({error:'請重新選擇官方卡面。'},{status:400});
  const {imageId}=JSON.parse(body);
  const image=cardImages.find(c=>c.id===imageId);
  if(!image)return Response.json({error:'尚未收錄此卡的官方卡面，可選擇其他官方卡面或上傳圖片。'},{status:400});
  // Only the curated official catalog may be fetched; never accept arbitrary URLs.
  const response=await fetch(image.url,{redirect:'error',signal:AbortSignal.timeout(12000),cache:'no-store',headers:{Accept:'image/png,image/jpeg,image/webp,image/gif',Referer:image.source}});
  if(!response.ok||!response.body)throw Error('Official image unavailable');
  if(Number(response.headers.get('content-length'))>5000000)throw Error('Official image too large');
  const reader=response.body.getReader(),chunks:Uint8Array[]=[];let length=0;
  while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>5000000){await reader.cancel();throw Error('Official image too large');}chunks.push(value);}
  const bytes=Buffer.concat(chunks);
  // Some bank catalogs use GIF. Decode only the first frame into our stored WebP.
  const gif=bytes.subarray(0,6).toString('ascii');
  if(!imageMime(bytes)&&gif!=='GIF87a'&&gif!=='GIF89a')throw Error('Official source is not an image');
  const decoded=sharp(bytes,{limitInputPixels:16000000}).rotate();
  const cardFace=image.id==='fubon-j'?decoded.trim({threshold:12}):decoded;
  const compressed=await cardFace.resize({width:960,height:960,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
  if(compressed.length>maxImageBytes)throw Error('Compressed image too large');
  const url=await saveCardImage(compressed,'image/webp');
  return Response.json({url,name:image.name,source:image.source,zoom:cardImageZoom(image.url)},{status:201});
 }catch{
  return Response.json({error:'官網暫時無法取得卡面，請稍後重試，或改用自行上傳。'},{status:503});
 }
}
