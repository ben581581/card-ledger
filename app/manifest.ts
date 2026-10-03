import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{return {
 name:'卡片進度簿',short_name:'卡片進度簿',description:'掌握還能刷多少，追蹤信用卡回饋與消費目標。',lang:'zh-Hant',start_url:'/',scope:'/',display:'standalone',background_color:'#090d14',theme_color:'#090d14',
 icons:[{src:'/icon-192-graphite-v2.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icon-512-graphite-v2.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icon-512-graphite-v2.png',sizes:'512x512',type:'image/png',purpose:'maskable'}],
};}
