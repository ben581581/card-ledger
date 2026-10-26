import {unstable_cache} from 'next/cache';
import {emptyFx,freshFxSnapshot,fxSourceUrl,isFxCurrency,type FxCurrency} from '../../../lib/fx';
import {parseFxPage} from '../../../lib/fx-source';

export const runtime='nodejs';
export const maxDuration=15;
const getRates=unstable_cache(async(currency:FxCurrency)=>{
  const response=await fetch(fxSourceUrl(currency),{
    cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),
    headers:{Accept:'text/html','User-Agent':'CARDI/1.0 (public exchange-rate reference; https://card-ledger-umber.vercel.app)'},
  });
  if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))throw new Error(`Exchange source HTTP ${response.status}`);
  const reader=response.body?.getReader();
  if(!reader)throw new Error('Empty exchange response');
  const chunks:Uint8Array[]=[];
  let size=0;
  try{
    while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>524288)throw new Error('Exchange source too large');chunks.push(chunk.value);}
  }finally{await reader.cancel().catch(()=>{});}
  return parseFxPage(Buffer.concat(chunks).toString('utf8'),currency);
},['cardi-fx-twrates-v1'],{revalidate:21600});

export async function GET(request:Request){
  const params=new URL(request.url).searchParams;
  const currency=params.get('currency')??'JPY';
  if(!isFxCurrency(currency)||[...params.keys()].some(key=>key!=='currency')||params.getAll('currency').length>1){
    return Response.json({error:'請選擇 JPY、USD、VND、THB 或 EUR。'},{status:400,headers:{'Cache-Control':'no-store'}});
  }
  try{
    const snapshot=await getRates(currency);
    if(!freshFxSnapshot(snapshot))throw new Error('Exchange cache expired');
    return Response.json(snapshot,{headers:{'Cache-Control':'public, max-age=60, s-maxage=900, stale-while-revalidate=3600','X-Content-Type-Options':'nosniff'}});
  }catch(error){
    console.error('Exchange rates unavailable',currency,error instanceof Error?error.message:'Unknown error');
    // A missing quote stays missing; never substitute a bank cash rate or a fabricated rate.
    return Response.json(emptyFx(currency),{headers:{'Cache-Control':'public, max-age=0, s-maxage=60','X-Content-Type-Options':'nosniff'}});
  }
}
