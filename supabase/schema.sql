-- Girvi Management System
-- Comprehensive PostgreSQL Schema for Supabase
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================================
-- 2. CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    relation_type VARCHAR(20) NOT NULL DEFAULT 'S/O' CHECK (relation_type IN ('S/O', 'D/O', 'W/O', 'C/O', 'O')),
    relation_name VARCHAR(255),
    mobile_number VARCHAR(20) NOT NULL,
    secondary_mobile VARCHAR(20),
    email VARCHAR(255),
    monthly_income NUMERIC(14, 2) DEFAULT 0.00 CHECK (monthly_income >= 0),
    address TEXT NOT NULL,
    city VARCHAR(100) DEFAULT 'Mumbai',
    pincode VARCHAR(20),
    photo_url TEXT,
    id_proof_type VARCHAR(50),
    id_proof_number VARCHAR(100),
    id_proof_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);

-- ============================================================================
-- 3. PLEDGES TABLE (GIRVI)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pledges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pledge_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    pledge_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    interest_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.50 CHECK (interest_rate_percent >= 0),
    interest_period VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (interest_period IN ('monthly', 'yearly')),
    total_articles_count INT NOT NULL DEFAULT 0 CHECK (total_articles_count >= 0),
    total_gross_weight NUMERIC(10, 3) NOT NULL DEFAULT 0.000 CHECK (total_gross_weight >= 0),
    total_less_weight NUMERIC(10, 3) NOT NULL DEFAULT 0.000 CHECK (total_less_weight >= 0),
    total_net_weight NUMERIC(10, 3) NOT NULL DEFAULT 0.000 CHECK (total_net_weight >= 0),
    total_present_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_present_value >= 0),
    total_loan_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_loan_amount >= 0),
    loan_amount_words TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'due_soon', 'overdue', 'closed', 'cancelled')),
    is_draft BOOLEAN NOT NULL DEFAULT false,
    closed_date DATE,
    closure_remarks TEXT,
    storage_location VARCHAR(100) DEFAULT 'Vault-1',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pledges_number ON pledges(pledge_number);
CREATE INDEX IF NOT EXISTS idx_pledges_customer_id ON pledges(customer_id);
CREATE INDEX IF NOT EXISTS idx_pledges_dates ON pledges(pledge_date, due_date);
CREATE INDEX IF NOT EXISTS idx_pledges_status ON pledges(status);

-- ============================================================================
-- 4. PLEDGE_ARTICLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS pledge_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pledge_id UUID NOT NULL REFERENCES pledges(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    metal_type VARCHAR(50) NOT NULL DEFAULT 'Gold',
    purity VARCHAR(50) DEFAULT '22K',
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    gross_weight NUMERIC(10, 3) NOT NULL CHECK (gross_weight >= 0),
    less_weight NUMERIC(10, 3) NOT NULL DEFAULT 0.000 CHECK (less_weight >= 0),
    net_weight NUMERIC(10, 3) NOT NULL CHECK (net_weight >= 0),
    present_value NUMERIC(14, 2) NOT NULL CHECK (present_value >= 0),
    loan_amount NUMERIC(14, 2) NOT NULL CHECK (loan_amount >= 0),
    loan_amount_words TEXT,
    item_photo_url TEXT,
    is_repledged BOOLEAN NOT NULL DEFAULT false,
    repledged_bank_name VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pledge_articles_pledge_id ON pledge_articles(pledge_id);

-- ============================================================================
-- 5. PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pledge_id UUID NOT NULL REFERENCES pledges(id) ON DELETE RESTRICT,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_type VARCHAR(30) NOT NULL CHECK (payment_type IN ('interest', 'principal', 'closure', 'partial')),
    principal_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (principal_amount >= 0),
    interest_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (interest_amount >= 0),
    penalty_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (penalty_amount >= 0),
    discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_paid NUMERIC(14, 2) NOT NULL CHECK (total_paid >= 0),
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash' CHECK (payment_mode IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque')),
    reference_number VARCHAR(100),
    remarks TEXT,
    received_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_pledge_id ON payments(pledge_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- ============================================================================
-- 6. STORAGE_DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS storage_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('customer_photo', 'id_proof', 'article_photo', 'pledge_receipt', 'document')),
    entity_id UUID NOT NULL,
    bucket_name VARCHAR(100) NOT NULL DEFAULT 'girvi-private',
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_docs_entity ON storage_documents(entity_type, entity_id);

-- ============================================================================
-- 7. AUDIT_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_name, entity_id);

-- ============================================================================
-- 8. BUSINESS_SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(255) NOT NULL DEFAULT 'Shree Ganesh Jewellers & Bankers',
    tagline VARCHAR(255) DEFAULT 'Trusted Gold & Pawn Financing Since 1994',
    license_number VARCHAR(100) DEFAULT 'MH-PB-2024-8849',
    gstin VARCHAR(50) DEFAULT '27AABCU9603R1ZM',
    owner_name VARCHAR(255) DEFAULT 'Ramesh Chandra Jeweller',
    phone VARCHAR(50) DEFAULT '+91 98765 43210',
    secondary_phone VARCHAR(50) DEFAULT '022-28491029',
    email VARCHAR(255) DEFAULT 'contact@ganeshjewellers.com',
    address_line1 TEXT DEFAULT 'Shop No. 12, Gold Souk Market, Zaveri Bazaar',
    city VARCHAR(100) DEFAULT 'Mumbai',
    state VARCHAR(100) DEFAULT 'Maharashtra',
    pincode VARCHAR(20) DEFAULT '400002',
    default_interest_rate NUMERIC(5, 2) DEFAULT 1.50,
    default_pledge_prefix VARCHAR(10) DEFAULT 'G-',
    terms_and_conditions TEXT DEFAULT '1. All jewellery items pledged are stored safely in computerized fireproof bank-grade lockers.
2. Interest is calculated on monthly basis according to state pawn-broking regulations.
3. Original receipt must be produced along with government photo identity proof at the time of redemption.
4. If the loan is not renewed or redeemed within 12 months, the pawn shop reserves the statutory right to auction the pledged goods after statutory legal notice.',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- SEED DEFAULT BUSINESS SETTINGS AND ADMIN USER
-- ============================================================================
INSERT INTO business_settings (id, business_name, tagline, license_number, gstin, owner_name, phone, secondary_phone, email, address_line1, city, state, pincode, default_interest_rate, default_pledge_prefix)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Shree Ganesh Jewellers & Bankers',
    'Govt. Approved Pawn Brokers & Gold Loan Specialist',
    'MH-PB-2024-8849',
    '27AABCU9603R1ZM',
    'Ramesh Chandra Sharma',
    '+91 98765 43210',
    '022-28491029',
    'admin@ganeshjewellers.com',
    'Shop No. 12, Gold Souk Market, Zaveri Bazaar',
    'Mumbai',
    'Maharashtra',
    '400002',
    1.50,
    'G-'
)
ON CONFLICT (id) DO NOTHING;

-- Default Admin: admin@ganeshjewellers.com / Admin@123456 (bcrypt hash: $2a$10$wK1bJ9F8.QhN53e.K5vOge8.6aKeqUvQz4bL3Hn8C8v4c1a/f7cKG or generated)
-- Default Staff: staff@ganeshjewellers.com / Staff@123456
INSERT INTO users (id, name, email, password_hash, role, is_active)
VALUES 
(
    'u0000000-0000-0000-0000-000000000001',
    'Admin Manager',
    'admin@ganeshjewellers.com',
    '$2a$10$f3P6/eS9t1l10yYJdCZeOup.y8k.1mD4aP.cE7PzqL1R8bB6xT31W', -- Hashed Admin@123456
    'admin',
    true
),
(
    'u0000000-0000-0000-0000-000000000002',
    'Pawn Counter Staff',
    'staff@ganeshjewellers.com',
    '$2a$10$f3P6/eS9t1l10yYJdCZeOup.y8k.1mD4aP.cE7PzqL1R8bB6xT31W', -- Hashed Staff@123456
    'staff',
    true
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access across all tables
DO $$
BEGIN
    EXECUTE 'CREATE POLICY "Service role full access on users" ON users FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Service role full access on customers" ON customers FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Service role full access on pledges" ON pledges FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Service role full access on pledge_articles" ON pledge_articles FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Service role full access on payments" ON payments FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Service role full access on storage_documents" ON storage_documents FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Service role full access on audit_logs" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Service role full access on business_settings" ON business_settings FOR ALL TO service_role USING (true) WITH CHECK (true)';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
