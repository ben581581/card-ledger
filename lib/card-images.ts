import type {Card} from './ledger';
import {uploadedImagePath} from './uploaded-images';
export const cardImages=[
 ...[{color:'黑色',file:'C_230x145B'},{color:'黃色',file:'C_230x145Y'},{color:'粉色',file:'UBear-P230144'}].map((variant,i)=>({id:`esun-ubear-${i+1}`,name:`玉山U Bear ${variant.color}`,bank:'玉山',keys:i===0?['ubear','u熊']:[],url:`https://www.esunbank.com/zh-tw/bank/-/media/New%20ESUNBANK/Credit%20Card/Card%20Intro/bank-card/u-bear/${variant.file}`,source:'https://www.esunbank.com/zh-tw/personal/credit-card/intro/bank-card/u-bear'})),
 ...['獸煌金','獨家女團','納克羅斯','特爾安娜絲','凡恩'].map((variant,i)=>({id:`dbs-aov-${i+1}`,name:`星展傳說對決聯名卡 ${variant}`,bank:'星展',keys:i===0?['傳說對決','aov']:[variant],url:`https://www.dbs.com.tw/personal-zh/cards/dbs-aov/images/cards/type_${i+1}.png`,source:'https://www.dbs.com.tw/personal-zh/cards/dbs-aov/index.html'})),
 {id:'sinopac-jcb',name:'永豐現金回饋JCB卡',bank:'永豐',keys:['jcb現金','現金jcb','現金回饋jcb','jcb現金回饋'],url:'https://bank.sinopac.com/upload/sinopac/picture/16c98d0bff700000bd35.jpg',source:'https://bank.sinopac.com/sinopacBT/personal/credit-card/introduction/bankcard/cashcardJCB.html'},
 {id:'sinopac-sport',name:'永豐SPORT卡',bank:'永豐',keys:['sport','運動卡'],url:'https://bank.sinopac.com/upload/sinopac/picture/1a031c14a5d000001bcd.png',source:'https://bank.sinopac.com/sinopacbt/personal/credit-card/introduction/bankcard/sportcard.html'},
 {id:'esun-unicard-white',name:'玉山Unicard 白色',bank:'玉山',keys:['unicard','uni卡'],url:'https://www.esunbank.com/zh-tw/-/media/New-ESUNBANK/Credit-Card/Card-Intro/bank-card/Unicard/1144x720_vw_A025CH',source:'https://www.esunbank.com/zh-tw/personal/credit-card/intro/bank-card/unicard'},
 {id:'esun-unicard-yellow',name:'玉山Unicard 黃色',bank:'玉山',keys:[],url:'https://www.esunbank.com/zh-tw/-/media/New-ESUNBANK/Credit-Card/Card-Intro/bank-card/Unicard/1144x720_vy_A026CH.png',source:'https://www.esunbank.com/zh-tw/personal/credit-card/intro/bank-card/unicard'},
 {id:'esun-unicard-blue',name:'玉山Unicard 藍色',bank:'玉山',keys:[],url:'https://www.esunbank.com/zh-tw/-/media/New-ESUNBANK/Credit-Card/Card-Intro/bank-card/Unicard/1144x720_vb_A027CH.png',source:'https://www.esunbank.com/zh-tw/personal/credit-card/intro/bank-card/unicard'},
];
const normalize=(v:string)=>v.toLowerCase().replace(/[\s\-＠@]/g,'');
export function matchedCardImage(name:string,bank:string){const n=normalize(name),b=normalize(bank);const matches=cardImages.filter(c=>(!b||b.includes(c.bank)||n.includes(c.bank))&&c.keys.some(k=>n.includes(k)));return matches.find(c=>c.id.startsWith('dbs-aov-')&&n.includes(c.name.split(' ').at(-1)!))||matches[0];}
export function cardImage(card:Card){return card.imageUrl!==undefined?card.imageUrl:matchedCardImage(card.name,card.bank)?.url||'';}
export function cardImageZoom(src:string){return cardImages.some(c=>c.bank==='永豐'&&c.url===src)?1.24:1;}
export function safeImageUrl(value:string){if(uploadedImagePath.test(value))return true;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
