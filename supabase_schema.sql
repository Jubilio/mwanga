-- TABELAS PARA SUPABASE POSTGRESQL (Mwanga ✦)

-- Households
CREATE TABLE IF NOT EXISTS households (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    household_id BIGINT REFERENCES households(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(15,2) NOT NULL,
    category TEXT,
    note TEXT,
    source_type TEXT DEFAULT 'manual',
    external_reference TEXT,
    fee_amount DECIMAL(15,2) DEFAULT 0,
    confidence_score DECIMAL(5,2),
    household_id BIGINT REFERENCES households(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Budgets
CREATE TABLE IF NOT EXISTS budgets (
    id BIGSERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    limit_amount DECIMAL(15,2) NOT NULL,
    household_id BIGINT REFERENCES households(id),
    UNIQUE(category, household_id)
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    target_amount DECIMAL(15,2) NOT NULL,
    saved_amount DECIMAL(15,2) DEFAULT 0,
    deadline TEXT,
    category TEXT,
    monthly_saving DECIMAL(15,2) DEFAULT 0,
    household_id BIGINT REFERENCES households(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Rentals
CREATE TABLE IF NOT EXISTS rentals (
    id BIGSERIAL PRIMARY KEY,
    month TEXT NOT NULL,
    landlord TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    household_id BIGINT REFERENCES households(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    value DECIMAL(15,2) NOT NULL,
    household_id BIGINT REFERENCES households(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Liabilities
CREATE TABLE IF NOT EXISTS liabilities (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    remaining_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 0,
    household_id BIGINT REFERENCES households(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Xitiques
CREATE TABLE IF NOT EXISTS xitiques (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    monthly_amount DECIMAL(15,2) NOT NULL,
    total_participants INTEGER NOT NULL,
    frequency TEXT DEFAULT 'mensal',
    start_date TEXT NOT NULL,
    your_position INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    household_id BIGINT REFERENCES households(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Xitique Cycles
CREATE TABLE IF NOT EXISTS xitique_cycles (
    id BIGSERIAL PRIMARY KEY,
    xitique_id BIGINT REFERENCES xitiques(id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL,
    due_date TEXT NOT NULL,
    receiver_position INTEGER NOT NULL,
    status TEXT DEFAULT 'pending'
);

-- Xitique Contributions
CREATE TABLE IF NOT EXISTS xitique_contributions (
    id BIGSERIAL PRIMARY KEY,
    xitique_id BIGINT REFERENCES xitiques(id) ON DELETE CASCADE,
    cycle_id BIGINT REFERENCES xitique_cycles(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    paid INTEGER DEFAULT 0,
    payment_date TEXT
);

-- Xitique Receipts
CREATE TABLE IF NOT EXISTS xitique_receipts (
    id BIGSERIAL PRIMARY KEY,
    xitique_id BIGINT REFERENCES xitiques(id) ON DELETE CASCADE,
    cycle_id BIGINT REFERENCES xitique_cycles(id) ON DELETE CASCADE,
    total_received DECIMAL(15,2) NOT NULL,
    received_date TEXT
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT NOT NULL,
    value TEXT,
    household_id BIGINT REFERENCES households(id),
    PRIMARY KEY(key, household_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    household_id BIGINT REFERENCES households(id),
    type TEXT,
    message TEXT,
    read INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id BIGINT,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    initial_balance DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    household_id BIGINT REFERENCES households(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Debts
CREATE TABLE IF NOT EXISTS debts (
    id BIGSERIAL PRIMARY KEY,
    creditor_name TEXT NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    remaining_amount DECIMAL(15,2) NOT NULL,
    due_date TEXT,
    status TEXT DEFAULT 'pending',
    household_id BIGINT REFERENCES households(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Debt Payments
CREATE TABLE IF NOT EXISTS debt_payments (
    id BIGSERIAL PRIMARY KEY,
    debt_id BIGINT REFERENCES debts(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    payment_date TEXT NOT NULL,
    household_id BIGINT REFERENCES households(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Financial Messages (SMS)
CREATE TABLE IF NOT EXISTS financial_messages (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT REFERENCES households(id),
    raw_text TEXT NOT NULL,
    source_detected TEXT,
    parsed_json TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Credit Applications
CREATE TABLE IF NOT EXISTS credit_applications (
    id BIGSERIAL PRIMARY KEY,
    amount DECIMAL(15,2) NOT NULL,
    months INTEGER NOT NULL,
    partner TEXT NOT NULL,
    purpose TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    bi_path TEXT,
    residencia_path TEXT,
    renda_path TEXT,
    selfie_path TEXT,
    household_id BIGINT REFERENCES households(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
