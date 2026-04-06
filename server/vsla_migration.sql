-- Create VSLA Groups Table
CREATE TABLE IF NOT EXISTS public.vsla_groups (
    id SERIAL PRIMARY KEY,
    household_id INTEGER REFERENCES public.households(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    currency TEXT DEFAULT 'MT',
    share_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
    interest_rate DECIMAL(5, 4) NOT NULL DEFAULT 0, -- Monthly interest rate
    meeting_frequency TEXT DEFAULT 'weekly', -- weekly, biweekly, monthly
    max_shares_per_member INTEGER DEFAULT 5,
    social_fund_contribution DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'active', -- active, closed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create VSLA Members Table
CREATE TABLE IF NOT EXISTS public.vsla_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES public.vsla_groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- president, treasurer, secretary, record_keeper, member
    status TEXT DEFAULT 'active', -- active, inactive, removed
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Create VSLA Cycles Table
CREATE TABLE IF NOT EXISTS public.vsla_cycles (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES public.vsla_groups(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT DEFAULT 'active', -- active, finished
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create VSLA Sessions (Meetings) Table
CREATE TABLE IF NOT EXISTS public.vsla_sessions (
    id SERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES public.vsla_cycles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'completed', -- scheduled, completed, cancelled
    summary JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create VSLA Contributions (Savings) Table
CREATE TABLE IF NOT EXISTS public.vsla_contributions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES public.vsla_sessions(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES public.vsla_members(id) ON DELETE CASCADE,
    shares INTEGER NOT NULL DEFAULT 0,
    amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create VSLA Loans Table
CREATE TABLE IF NOT EXISTS public.vsla_loans (
    id SERIAL PRIMARY KEY,
    cycle_id INTEGER REFERENCES public.vsla_cycles(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES public.vsla_members(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    reason TEXT,
    interest_rate DECIMAL(5, 4) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'approved', -- approved, paid, defaulted
    approved_by INTEGER REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create VSLA Repayments Table
CREATE TABLE IF NOT EXISTS public.vsla_repayments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER REFERENCES public.vsla_loans(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES public.vsla_sessions(id) ON DELETE CASCADE,
    principal_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
    interest_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create VSLA Fines Table
CREATE TABLE IF NOT EXISTS public.vsla_fines (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES public.vsla_sessions(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES public.vsla_members(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    reason TEXT, -- late, absence, etc.
    status TEXT DEFAULT 'paid', -- unpaid, paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create VSLA Social Fund Table
CREATE TABLE IF NOT EXISTS public.vsla_social_fund (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES public.vsla_groups(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES public.vsla_sessions(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES public.vsla_members(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- contribution, disbursement
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
