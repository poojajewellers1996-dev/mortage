import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/girvi_db';

// Supabase SSL requirement check
const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('supabase.com') || connectionString.includes('pooler');

export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: isSupabase ? 'require' : false,
});

export const db = drizzle(client, { schema });
