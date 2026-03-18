BEGIN;

-- 1) Add auth_user_id to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE;

-- 2) Improve safety: revoke public access to functions if any (no-op if none)

-- 3) Recreate key policies to use auth_user_id. We'll DROP existing policies with the same names if present and create safer versions.

-- USERS table policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view household members" ON public.users;

CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Users can view household members"
  ON public.users
  FOR SELECT
  USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- HOUSEHOLDS
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own household" ON public.households;
DROP POLICY IF EXISTS "Users can update their own household" ON public.households;

CREATE POLICY "Users can view their own household"
  ON public.households
  FOR SELECT
  USING (id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own household"
  ON public.households
  FOR UPDATE
  USING (id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- TRANSACTIONS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert household transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update household transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete household transactions" ON public.transactions;

CREATE POLICY "Users can view household transactions"
  ON public.transactions
  FOR SELECT
  USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert household transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update household transactions"
  ON public.transactions
  FOR UPDATE
  USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()))
  WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can delete household transactions"
  ON public.transactions
  FOR DELETE
  USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- Example pattern for other household-scoped tables: budgets, goals, rentals, assets, liabilities, xitiques, credit_applications, loans, accounts, debts, financial_messages, settings, notifications

-- BUDGETS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can manage household budgets" ON public.budgets;
CREATE POLICY "Users can view household budgets" ON public.budgets FOR SELECT USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can manage household budgets" ON public.budgets FOR ALL USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())) WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- GOALS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household goals" ON public.goals;
DROP POLICY IF EXISTS "Users can manage household goals" ON public.goals;
CREATE POLICY "Users can view household goals" ON public.goals FOR SELECT USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can manage household goals" ON public.goals FOR ALL USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())) WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- RENTALS
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household rentals" ON public.rentals;
DROP POLICY IF EXISTS "Users can manage household rentals" ON public.rentals;
CREATE POLICY "Users can view household rentals" ON public.rentals FOR SELECT USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can manage household rentals" ON public.rentals FOR ALL USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())) WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ASSETS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household assets" ON public.assets;
DROP POLICY IF EXISTS "Users can manage household assets" ON public.assets;
CREATE POLICY "Users can view household assets" ON public.assets FOR SELECT USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can manage household assets" ON public.assets FOR ALL USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())) WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- LIABILITIES
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household liabilities" ON public.liabilities;
DROP POLICY IF EXISTS "Users can manage household liabilities" ON public.liabilities;
CREATE POLICY "Users can view household liabilities" ON public.liabilities FOR SELECT USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can manage household liabilities" ON public.liabilities FOR ALL USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())) WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- XITIQUES
ALTER TABLE public.xitiques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view group xitiques" ON public.xitiques;
DROP POLICY IF EXISTS "Users can manage group xitiques" ON public.xitiques;
CREATE POLICY "Users can view group xitiques" ON public.xitiques FOR SELECT USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can manage group xitiques" ON public.xitiques FOR ALL USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())) WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- XITIQUE CYCLES
ALTER TABLE public.xitique_cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their xitique cycles" ON public.xitique_cycles;
DROP POLICY IF EXISTS "Users can manage their xitique cycles" ON public.xitique_cycles;
CREATE POLICY "Users can view their xitique cycles" ON public.xitique_cycles FOR SELECT USING (xitique_id IN (SELECT id FROM public.xitiques WHERE household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())));
CREATE POLICY "Users can manage their xitique cycles" ON public.xitique_cycles FOR ALL USING (xitique_id IN (SELECT id FROM public.xitiques WHERE household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()))) WITH CHECK (xitique_id IN (SELECT id FROM public.xitiques WHERE household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())));

-- XITIQUE CONTRIBUTIONS
ALTER TABLE public.xitique_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view xitique contributions" ON public.xitique_contributions;
DROP POLICY IF EXISTS "Users can contribute to xitiques" ON public.xitique_contributions;
CREATE POLICY "Users can view xitique contributions" ON public.xitique_contributions FOR SELECT USING (xitique_id IN (SELECT id FROM public.xitiques WHERE household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())));
CREATE POLICY "Users can contribute to xitiques" ON public.xitique_contributions FOR INSERT WITH CHECK (xitique_id IN (SELECT id FROM public.xitiques WHERE household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())));

-- XITIQUE RECEIPTS
ALTER TABLE public.xitique_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view xitique receipts" ON public.xitique_receipts;
CREATE POLICY "Users can view xitique receipts" ON public.xitique_receipts FOR SELECT USING (xitique_id IN (SELECT id FROM public.xitiques WHERE household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())));

-- CREDIT APPLICATIONS
ALTER TABLE public.credit_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household credit applications" ON public.credit_applications;
DROP POLICY IF EXISTS "Users can manage household credit applications" ON public.credit_applications;
CREATE POLICY "Users can view household credit applications" ON public.credit_applications FOR SELECT USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can manage household credit applications" ON public.credit_applications FOR ALL USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())) WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- LOANS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household loans" ON public.loans;
DROP POLICY IF EXISTS "Users can manage household loans" ON public.loans;
CREATE POLICY "Users can view household loans" ON public.loans FOR SELECT USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can manage household loans" ON public.loans FOR ALL USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())) WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- LOAN PAYMENTS
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household loan payments" ON public.loan_payments;
DROP POLICY IF EXISTS "Users can record loan payments" ON public.loan_payments;
CREATE POLICY "Users can view household loan payments" ON public.loan_payments FOR SELECT USING (loan_id IN (SELECT id FROM public.loans WHERE household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())));
CREATE POLICY "Users can record loan payments" ON public.loan_payments FOR INSERT WITH CHECK (loan_id IN (SELECT id FROM public.loans WHERE household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())));

-- DEBTS
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household debts" ON public.debts;
DROP POLICY IF EXISTS "Users can manage household debts" ON public.debts;
CREATE POLICY "Users can view household debts" ON public.debts FOR SELECT USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can manage household debts" ON public.debts FOR ALL USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())) WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- DEBT PAYMENTS
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household debt payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Users can record debt payments" ON public.debt_payments;
CREATE POLICY "Users can view household debt payments" ON public.debt_payments FOR SELECT USING (debt_id IN (SELECT id FROM public.debts WHERE household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())));
CREATE POLICY "Users can record debt payments" ON public.debt_payments FOR INSERT WITH CHECK (debt_id IN (SELECT id FROM public.debts WHERE household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())));

-- SETTINGS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their household settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update their household settings" ON public.settings;
DROP POLICY IF EXISTS "Users can insert their household settings" ON public.settings;
CREATE POLICY "Users can view their household settings" ON public.settings FOR SELECT USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can update their household settings" ON public.settings FOR UPDATE USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())) WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can insert their household settings" ON public.settings FOR INSERT WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their household notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their household notifications" ON public.notifications;
CREATE POLICY "Users can view their household notifications" ON public.notifications FOR SELECT USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can update their household notifications" ON public.notifications FOR UPDATE USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ACCOUNTS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can manage household accounts" ON public.accounts;
CREATE POLICY "Users can view household accounts" ON public.accounts FOR SELECT USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can manage household accounts" ON public.accounts FOR ALL USING (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid())) WITH CHECK (household_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- FINANCIAL_MESSAGES
ALTER TABLE public.financial_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household messages" ON public.financial_messages;
DROP POLICY IF EXISTS "Users can create household messages" ON public.financial_messages;
CREATE POLICY "Users can view household messages" ON public.financial_messages FOR SELECT USING (tenant_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));
CREATE POLICY "Users can create household messages" ON public.financial_messages FOR INSERT WITH CHECK (tenant_id = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- AUDIT_LOG: this table does not have household_id column in DDL, derive via user_id
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view household audit logs" ON public.audit_log;
CREATE POLICY "Users can view household audit logs" ON public.audit_log FOR SELECT USING ((SELECT household_id FROM public.users WHERE id = public.audit_log.user_id) = (SELECT household_id FROM public.users WHERE auth_user_id = auth.uid()));

-- KYC_DOCUMENTS: user-scoped by user_id
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON public.kyc_documents;
DROP POLICY IF EXISTS "Users can insert their own KYC documents" ON public.kyc_documents;
DROP POLICY IF EXISTS "Users can update their own KYC documents" ON public.kyc_documents;
CREATE POLICY "Users can view their own KYC documents" ON public.kyc_documents FOR SELECT USING ((SELECT auth_user_id FROM public.users WHERE id = public.kyc_documents.user_id) = auth.uid());
CREATE POLICY "Users can insert their own KYC documents" ON public.kyc_documents FOR INSERT WITH CHECK ((SELECT auth_user_id FROM public.users WHERE id = public.kyc_documents.user_id) = auth.uid());
CREATE POLICY "Users can update their own KYC documents" ON public.kyc_documents FOR UPDATE USING ((SELECT auth_user_id FROM public.users WHERE id = public.kyc_documents.user_id) = auth.uid()) WITH CHECK ((SELECT auth_user_id FROM public.users WHERE id = public.kyc_documents.user_id) = auth.uid());

COMMIT;