-- 🚀 OTIMIZAÇÕES DE BANCO DE DADOS - MWANGA
-- ============================================
-- Script para otimizar performance do Supabase PostgreSQL
-- Execute no SQL Editor do Supabase

-- 1️⃣ ÍNDICES ESSENCIAIS PARA PERFORMANCE
-- ========================================

-- Índices para transactions (queries mais frequentes)
CREATE INDEX IF NOT EXISTS idx_transactions_household_date ON transactions(household_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(household_id, category);
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date);
CREATE INDEX IF NOT EXISTS idx_transactions_household_type ON transactions(household_id, type);

-- Índices para budgets
CREATE INDEX IF NOT EXISTS idx_budgets_household_category ON budgets(household_id, category);

-- Índices para goals
CREATE INDEX IF NOT EXISTS idx_goals_household ON goals(household_id);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_household ON users(household_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_household ON notifications(household_id);

-- Índices para xitiques
CREATE INDEX IF NOT EXISTS idx_xitiques_household ON xitiques(household_id);

-- Índices para debts e payments
CREATE INDEX IF NOT EXISTS idx_debts_household ON debts(household_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);

-- Índices para loans
CREATE INDEX IF NOT EXISTS idx_loans_household ON loans(household_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON loan_payments(loan_id);

-- Índices para financial_messages
CREATE INDEX IF NOT EXISTS idx_financial_messages_tenant ON financial_messages(tenant_id);

-- 2️⃣ VIEWS PARA AGREGADOS FREQUENTES
-- ====================================

-- View para gastos mensais por categoria
CREATE OR REPLACE VIEW monthly_spending AS
SELECT
  household_id,
  category,
  DATE_TRUNC('month', date::date) as month,
  SUM(amount) as total_spent,
  COUNT(*) as transaction_count
FROM transactions
WHERE type IN ('despesa', 'renda')
GROUP BY household_id, category, DATE_TRUNC('month', date::date);

-- View para saldo de contas
CREATE OR REPLACE VIEW account_balances AS
SELECT
  a.id,
  a.name,
  a.household_id,
  a.initial_balance,
  a.current_balance,
  COALESCE(SUM(CASE
    WHEN t.type IN ('receita', 'poupanca') THEN t.amount
    WHEN t.type = 'despesa' THEN -t.amount
    ELSE 0
  END), 0) as calculated_balance
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id
GROUP BY a.id, a.name, a.household_id, a.initial_balance, a.current_balance;

-- View para orçamento vs gasto mensal
CREATE OR REPLACE VIEW budget_vs_spending AS
SELECT
  b.household_id,
  b.category,
  b.limit_amount,
  COALESCE(ms.total_spent, 0) as spent_this_month,
  CASE WHEN COALESCE(ms.total_spent, 0) > b.limit_amount THEN true ELSE false END as over_budget
FROM budgets b
LEFT JOIN monthly_spending ms ON ms.household_id = b.household_id
  AND ms.category = b.category
  AND ms.month = DATE_TRUNC('month', CURRENT_DATE);

-- 3️⃣ MATERIALIZED VIEW PARA BUDGET SPENDING (atualizar mensalmente)
-- =================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS budget_spending_monthly AS
SELECT
  b.household_id,
  b.category,
  b.limit_amount,
  DATE_TRUNC('month', CURRENT_DATE) as month,
  COALESCE(SUM(t.amount), 0) as spent
FROM budgets b
LEFT JOIN transactions t ON t.category = b.category
  AND t.household_id = b.household_id
  AND t.type IN ('despesa', 'renda')
  AND DATE_TRUNC('month', t.date::date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY b.household_id, b.category, b.limit_amount;

-- Índice na materialized view
CREATE INDEX IF NOT EXISTS idx_budget_spending_monthly_household ON budget_spending_monthly(household_id);

-- Função para refresh (chamar mensalmente)
CREATE OR REPLACE FUNCTION refresh_budget_spending()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW budget_spending_monthly;
END;
$$ LANGUAGE plpgsql;

-- 4️⃣ VERIFICAÇÃO DE PERFORMANCE
-- ==============================

-- Query para verificar índices criados
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Query para verificar tamanho das tabelas
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;