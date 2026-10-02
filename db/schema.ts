import {pgTable,text,jsonb,integer,timestamp} from 'drizzle-orm/pg-core';
export const ledgers=pgTable('ledgers',{id:text('id').primaryKey(),payload:jsonb('payload').notNull(),revision:integer('revision').notNull().default(0),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow()});
