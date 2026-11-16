import { client } from './index.js';

async function migrateRepledge() {
  console.log('🔄 Creating repledge tables...');
  try {
    await client.unsafe(`
      CREATE TABLE IF NOT EXISTS repledges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pledger_name VARCHAR(255) NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        bank_pledge_number VARCHAR(100) NOT NULL,
        bank_pledge_date DATE NOT NULL DEFAULT CURRENT_DATE,
        bank_pledge_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        released_date DATE,
        release_remarks TEXT,
        remarks TEXT,
        total_pledges_count INTEGER NOT NULL DEFAULT 0,
        total_gross_weight NUMERIC(10, 3) DEFAULT 0.000,
        total_net_weight NUMERIC(10, 3) DEFAULT 0.000,
        linked_pledge_numbers JSONB DEFAULT '[]'::jsonb,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS repledge_pledges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        repledge_id UUID NOT NULL REFERENCES repledges(id) ON DELETE CASCADE,
        pledge_id UUID NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
        pledge_number VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE pledges ADD COLUMN IF NOT EXISTS is_repledged BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE pledges ADD COLUMN IF NOT EXISTS repledge_id UUID REFERENCES repledges(id) ON DELETE SET NULL;
      ALTER TABLE pledges ADD COLUMN IF NOT EXISTS repledged_bank_name VARCHAR(255);
    `);
    console.log('✅ Repledge tables and columns created successfully in PostgreSQL!');
  } catch (err) {
    console.error('❌ Repledge migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrateRepledge();
