import { client } from './index.js';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  console.log('🔄 Running database migrations...');
  try {
    const schemaPath = path.resolve(process.cwd(), '../supabase/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    await client.unsafe(sqlContent);
    console.log('✅ Database schema and tables applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
