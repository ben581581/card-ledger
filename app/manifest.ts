import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{return {
 name:'CARDI',short_name:'CARDI',description:'一眼看到每張卡還能刷多少、有沒有滿額，再挑這筆該刷哪張。',lang:'zh-Hant',start_url:'/',scope:'/',display:'standalone',background_color:'#000000',theme_color:'#000000',
 icons:[{src:'/icon-192-graphite-v2.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icon-512-graphite-v2.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icon-512-graphite-v2.png',sizes:'512x512',type:'image/png',purpose:'maskable'}],
};}
