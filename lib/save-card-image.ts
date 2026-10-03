import {randomUUID} from 'node:crypto';
import {drizzle} from 'drizzle-orm/neon-http';
import {database} from './db';
import {cardImages} from '../db/schema';

export async function saveCardImage(bytes:Uint8Array,mimeType:string){
 const id=randomUUID();
 await drizzle(database()).insert(cardImages).values({id,mimeType,imageData:Buffer.from(bytes).toString('base64')});
 return `/api/card-images/${id}`;
}
