import type {NextConfig} from 'next';

const config:NextConfig={
 devIndicators:false,
 // Card images live in the cloud database; a local run without one borrows them read-only.
 async rewrites(){
  if(process.env.DATABASE_URL||process.env.NODE_ENV==='production')return [];
  return {beforeFiles:[{source:'/api/card-images/:id([0-9a-f-]{36})',destination:'https://card-ledger-umber.vercel.app/api/card-images/:id'}],afterFiles:[],fallback:[]};
 },
};
export default config;
