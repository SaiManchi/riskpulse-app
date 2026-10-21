-- Enable the pgvector extension if it exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Users (roles: admin, analyst)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'analyst')),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Clients (SMEs monitored by MSPs)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    industry TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Financial Metrics
CREATE TABLE IF NOT EXISTS financial_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    recorded_month DATE NOT NULL,
    current_assets NUMERIC DEFAULT 0,
    current_liabilities NUMERIC DEFAULT 0,
    inventory NUMERIC DEFAULT 0,
    total_debt NUMERIC DEFAULT 0,
    total_equity NUMERIC DEFAULT 0,
    cash_balance NUMERIC DEFAULT 0,
    monthly_burn_rate NUMERIC DEFAULT 0,
    monthly_revenue NUMERIC DEFAULT 0,
    net_income NUMERIC DEFAULT 0,
    outstanding_receivables NUMERIC DEFAULT 0,
    upcoming_obligations NUMERIC DEFAULT 0,
    late_payment_percentage NUMERIC DEFAULT 0,
    working_capital NUMERIC DEFAULT 0,
    customer_concentration NUMERIC DEFAULT 0, -- percent
    vendor_concentration NUMERIC DEFAULT 0, -- percent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bank/Accounting Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    category TEXT,
    is_flagged BOOLEAN DEFAULT false,
    flag_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    criticality TEXT CHECK (criticality IN ('low', 'medium', 'high', 'critical')),
    payment_history TEXT,
    security_score NUMERIC CHECK (security_score >= 0 AND security_score <= 100),
    contract_renewal DATE,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cybersecurity Assessments
CREATE TABLE IF NOT EXISTS cybersecurity_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE UNIQUE,
    mfa_enabled BOOLEAN DEFAULT false,
    password_policy_enabled BOOLEAN DEFAULT false,
    backup_status TEXT, -- 'active', 'outdated', 'none'
    endpoint_protection BOOLEAN DEFAULT false,
    phishing_incidents_count INTEGER DEFAULT 0,
    open_vulnerabilities_count INTEGER DEFAULT 0,
    patch_status TEXT, -- 'current', 'outdated', 'critical_missing'
    security_awareness_completion NUMERIC DEFAULT 0, -- percentage
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Document Metadata
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_type TEXT,
    file_url TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Document Chunk Embeddings for pgvector
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    chunk_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Generated PDF Reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT,
    risk_score_financial NUMERIC,
    risk_score_cyber NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Chat History
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations TEXT, -- JSON Array of cited document names
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
