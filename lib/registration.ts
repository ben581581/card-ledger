export type Registration={type:'required'|'setup'|'none'|'verify';label:string;details:string;url?:string};
export const registrationLabels={required:'需登錄',setup:'需先設定',none:'免登錄',verify:'待核對'};
export function safeRegistrationUrl(value:string){
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}
}
export function registrationFromFields(type:string,label:string,details:string,url:string):Registration|undefined{
 if(!Object.hasOwn(registrationLabels,type))return undefined;
 return {type:type as Registration['type'],label:label.trim()||registrationLabels[type as Registration['type']],details:details.trim(),...(url.trim()?{url:url.trim()}:{} )};
}
