// Opens from the home screen without waiting on the network.
// Hashed build files are immutable; the page itself prefers fresh, but never waits long for it.
// The ledger API is deliberately not cached here: use-ledger keeps its own snapshot.
const VERSION='cardi-v1',PAGE='/',WAIT=1200;

self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key!==VERSION)await caches.delete(key);
 await self.clients.claim();
})()));

async function immutable(request){
 const cache=await caches.open(VERSION),hit=await cache.match(request);
 if(hit)return hit;
 const response=await fetch(request);
 if(response.ok)await cache.put(request,response.clone());
 return response;
}

async function page(request){
 const cache=await caches.open(VERSION);
 const network=fetch(request).then(async response=>{
  if(response.ok)await cache.put(PAGE,response.clone());
  return response;
 });
 const fallback=new Promise(resolve=>setTimeout(async()=>resolve(await cache.match(PAGE)),WAIT));
 try{return await Promise.race([network,fallback]).then(result=>result||network);}
 catch{return (await cache.match(PAGE))||Response.error();}
}

self.addEventListener('fetch',event=>{
 const {request}=event,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/'))return;
 if(url.pathname.startsWith('/_next/static/'))event.respondWith(immutable(request));
 else if(request.mode==='navigate')event.respondWith(page(request));
});
