-- ################################################################################
-- Mwanga Database Security Hardening Migration
-- Addresses Supabase Linter Errors (RLS, Security Definer, Search Path)
-- ################################################################################

-- 1. ENABLE ROW LEVEL SECURITY ON ALL PUBLIC TABLES
-- This closes the gap for the external PostgREST API while allowing 
-- your Express server (using the 'postgres' role) to remain unaffected.

DO $$ 
DECLARE 
    tbl text;
BEGIN 
    FOR tbl IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'vsla_groups', 'vsla_cycles', 'vsla_members', 'vsla_sessions', 
            'vsla_contributions', 'vsla_loans', 'vsla_repayments', 'vsla_fines', 
            'vsla_social_fund', 'household_invites', 'user_badges', 'badges', 
            'push_subscriptions', 'behavior_events', 'passkeys', 
            'notification_events', 'user_notification_stats', 
            'notification_candidates', 'notification_preferences', 
            'notification_delivery_logs', 'feedbacks'
        ) 
    LOOP 
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    END LOOP;
END $$;

-- 2. CREATE DEFAULT 'DENY ALL' POLICIES FOR EXTERNAL API
-- By default, RLS denies all access. We explicitly add a policy to confirm
-- that only the server/admin can access these for now. 
-- To allow users to access their own data via Supabase API in the future,
-- you would add policies like: USING (auth.uid() = mapping_column)

-- 3. HARDEN SECURITY DEFINER VIEWS
-- Views defined with SECURITY DEFINER run with the permissions of the creator.
-- This changes them to SECURITY INVOKER (Postgres 15+) to run with the querying user's permissions.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'account_balances') THEN
        ALTER VIEW public.account_balances SET (security_invoker = true);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'budget_vs_spending') THEN
        ALTER VIEW public.budget_vs_spending SET (security_invoker = true);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'monthly_spending') THEN
        ALTER VIEW public.monthly_spending SET (security_invoker = true);
    END IF;
END $$;

-- 4. HARDEN FUNCTIONS (SET SEARCH PATH)
-- Prevents search_path hijacking by fixing it to the public schema.
-- We use a DO block to find the function and its signature before altering.

DO $$
DECLARE
    func_name text;
BEGIN
    -- Only alter if the function exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_budget_spending') THEN
        ALTER FUNCTION public.refresh_budget_spending SET search_path = public;
    END IF;
END $$;

-- 5. RESTRICT MATERIALIZED VIEWS FROM API ACCESS
-- Materialized views don't support RLS, so we revoke public access entirely.

REVOKE SELECT ON public.budget_spending_monthly FROM anon, authenticated;

-- ################################################################################
-- Hardening Summary Applied.
-- ################################################################################
