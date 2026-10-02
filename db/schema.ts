import {pgTable,text,jsonb,integer,timestamp} from 'drizzle-orm/pg-core';
export const ledgers=pgTable('ledgers',{id:text('id').primaryKey(),payload:jsonb('payload').notNull(),revision:integer('revision').notNull().default(0),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow()});
export const cardImages=pgTable('card_images',{id:text('id').primaryKey(),mimeType:text('mime_type').notNull(),imageData:text('image_data').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow()});
