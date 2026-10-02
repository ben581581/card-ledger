import {neon} from '@neondatabase/serverless';
import {drizzle} from 'drizzle-orm/neon-http';
import {migrate} from 'drizzle-orm/neon-http/migrator';
if(!process.env.DATABASE_URL)process.loadEnvFile('.env.local');
const direct=process.env.DATABASE_URL.replace('-pooler.','.');
await migrate(drizzle(neon(direct)),{migrationsFolder:'./drizzle'});
console.log('Drizzle migrations completed.');
