-- ################################################################################
-- Mwanga Database RLS Policies Implementation
-- Resolves "RLS Enabled No Policy" warnings and enables secure external access.
-- ################################################################################

-- 1. USER MAPPING SETUP
-- Adds the column to link Supabase Auth (UUID) with public.users (Int)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_id uuid UNIQUE;

-- 2. INTERNAL USER MAPPING HELPER
-- Keep this schema outside the Supabase Data API Exposed schemas.
CREATE SCHEMA IF NOT EXISTS mwanga_private;
REVOKE ALL ON SCHEMA mwanga_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA mwanga_private TO authenticated;
DO $$
BEGIN
  IF to_regprocedure('public.get_my_user_id()') IS NOT NULL THEN
    IF to_regprocedure('mwanga_private.get_my_user_id()') IS NOT NULL THEN
      RAISE EXCEPTION 'Both helper functions exist; review dependencies first';
    END IF;
    ALTER FUNCTION public.get_my_user_id() SET SCHEMA mwanga_private;
  END IF;
END $$;
CREATE OR REPLACE FUNCTION mwanga_private.get_my_user_id()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT u.id FROM public.users AS u
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND u.auth_id = (SELECT auth.uid());
$$;
REVOKE ALL ON FUNCTION mwanga_private.get_my_user_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION mwanga_private.get_my_user_id() TO authenticated;

-- 3. POLICIES FOR LOOKUP TABLES
-- These tables are read-only for all authenticated users.

-- Table: badges
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.badges;
CREATE POLICY "Allow authenticated read access" ON public.badges
FOR SELECT TO authenticated USING (true);

-- 4. POLICIES FOR OWNERSHIP-BASED TABLES
-- Only the owner (user_id) can manage their records.

DO $$ 
DECLARE 
    tbl text;
    ownership_tables text[] := ARRAY[
        'behavior_events', 'feedbacks', 'notification_candidates', 
        'notification_delivery_logs', 'notification_events', 
        'notification_preferences', 'passkeys', 'push_subscriptions', 
        'user_badges', 'user_notification_stats'
    ];
BEGIN 
    FOREACH tbl IN ARRAY ownership_tables LOOP 
        EXECUTE format('DROP POLICY IF EXISTS "Users can manage their own records" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Users can manage their own records" ON public.%I FOR ALL TO authenticated USING (user_id = mwanga_private.get_my_user_id());', tbl);
    END LOOP;
END $$;

-- 5. POLICIES FOR HOUSEHOLD & GROUP TABLES
-- Access is restricted to members of the same household or group.

-- Table: household_invites
DROP POLICY IF EXISTS "Household members can view invites" ON public.household_invites;
CREATE POLICY "Household members can view invites" ON public.household_invites
FOR SELECT TO authenticated USING (
    household_id = (SELECT household_id FROM public.users WHERE id = mwanga_private.get_my_user_id())
);

-- Table: vsla_groups
DROP POLICY IF EXISTS "Household members can view groups" ON public.vsla_groups;
CREATE POLICY "Household members can view groups" ON public.vsla_groups
FOR SELECT TO authenticated USING (
    household_id = (SELECT household_id FROM public.users WHERE id = mwanga_private.get_my_user_id())
);

-- Table: vsla_members
DROP POLICY IF EXISTS "Users can see their own membership" ON public.vsla_members;
CREATE POLICY "Users can see their own membership" ON public.vsla_members
FOR SELECT TO authenticated USING (user_id = mwanga_private.get_my_user_id());

-- Table: vsla_cycles, vsla_sessions
DROP POLICY IF EXISTS "Group members can view cycles and sessions" ON public.vsla_cycles;
CREATE POLICY "Group members can view cycles and sessions" ON public.vsla_cycles
FOR SELECT TO authenticated USING (
    group_id IN (SELECT group_id FROM public.vsla_members WHERE user_id = mwanga_private.get_my_user_id())
);

DROP POLICY IF EXISTS "Group members can view sessions" ON public.vsla_sessions;
CREATE POLICY "Group members can view sessions" ON public.vsla_sessions
FOR SELECT TO authenticated USING (
    cycle_id IN (SELECT id FROM public.vsla_cycles WHERE group_id IN (SELECT group_id FROM public.vsla_members WHERE user_id = mwanga_private.get_my_user_id()))
);

-- Table: vsla_contributions, vsla_loans, vsla_fines, vsla_social_fund
-- Owners can manage, group members can view.

DO $$ 
DECLARE 
    tbl text;
    financial_tables text[] := ARRAY[
        'vsla_contributions', 'vsla_loans', 'vsla_fines', 'vsla_social_fund'
    ];
BEGIN 
    FOREACH tbl IN ARRAY financial_tables LOOP 
        EXECUTE format('DROP POLICY IF EXISTS "Members can view their own financial records" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Members can view their own financial records" ON public.%I FOR ALL TO authenticated USING (member_id IN (SELECT id FROM vsla_members WHERE user_id = mwanga_private.get_my_user_id()));', tbl);
    END LOOP;
END $$;

-- Table: vsla_repayments
-- Note: Uses loan_id instead of direct member_id
DROP POLICY IF EXISTS "Members can view their own repayments" ON public.vsla_repayments;
CREATE POLICY "Members can view their own repayments" ON public.vsla_repayments
FOR ALL TO authenticated USING (
    loan_id IN (SELECT id FROM vsla_loans WHERE member_id IN (SELECT id FROM vsla_members WHERE user_id = mwanga_private.get_my_user_id()))
);

-- Table: settings
DROP POLICY IF EXISTS "Household members can manage settings" ON public.settings;
CREATE POLICY "Household members can manage settings" ON public.settings
FOR ALL TO authenticated USING (
    household_id = (SELECT household_id FROM public.users WHERE id = mwanga_private.get_my_user_id())
);

-- ################################################################################
-- RLS Policy Migration Completed.
-- ################################################################################
