/**
 * Dashboard Summary Controller
 *
 * Agrega numa única query os dados essenciais para o dashboard do utilizador,
 * substituindo os 13 chamadas paralelas do frontend por 1 endpoint otimizado.
 *
 * Trade-offs:
 *  - Menos round-trips HTTP → TTFCP significativamente mais baixo
 *  - Lógica de dados no servidor onde pertence
 *  - Cacheável por householdId com TTL curto (30s)
 */

const { db } = require('../config/db');
const redis = require('../utils/redis');
const logger = require('../utils/logger');

const CACHE_TTL_SECONDS = 30;

const getDashboardSummary = async (req, res) => {
  const householdId = req.user?.householdId;
  if (!householdId) {
    return res.status(401).json({ error: 'Unauthorized: No household ID' });
  }

  const cacheKey = `dashboard:${householdId}`;

  // ── Cache check ──────────────────────────────────────────────────────────────
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(typeof cached === 'string' ? JSON.parse(cached) : cached);
      }
    } catch (redisError) {
      logger.warn({ err: redisError }, 'Redis cache miss on dashboard summary');
    }
  }

  try {
    const now = new Date();
    // Mwanga usa um mês financeiro que pode começar num dia diferente de 1.
    // O dashboard usa o mês atual do calendário para as queries SQL — o cálculo
    // do "mês financeiro" é feito no cliente com getFinancialMonthKey().
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // ── Todas as queries executam em paralelo para minimizar latência ────────────
    const [
      transactionsResult,
      rentalsResult,
      goalsResult,
      budgetsResult,
      assetsResult,
      liabilitiesResult,
      xitiquesResult,
      settingsResult,
      userResult,
      debtsResult,
      accountsResult,
      loanApplicationsResult,
      loansResult,
    ] = await Promise.all([
      // Últimas 200 transações (suficiente para cálculos mensais + histórico)
      db.execute({
        sql: `SELECT id, date, type, description, amount, category, note, account_id
              FROM transactions WHERE household_id = ?
              ORDER BY date DESC, id DESC LIMIT 200`,
        args: [householdId],
      }),

      db.execute({
        sql: `SELECT id, month, landlord, amount, status, notes
              FROM rentals WHERE household_id = ? ORDER BY month DESC`,
        args: [householdId],
      }),

      db.execute({
        sql: `SELECT id, name, target_amount, saved_amount, deadline, category, monthly_saving
              FROM goals WHERE household_id = ? ORDER BY created_at DESC`,
        args: [householdId],
      }),

      db.execute({
        sql: `SELECT id, category, limit_amount FROM budgets WHERE household_id = ?`,
        args: [householdId],
      }),

      db.execute({
        sql: `SELECT id, name, type, value FROM assets WHERE household_id = ?`,
        args: [householdId],
      }),

      db.execute({
        sql: `SELECT id, name, total_amount, remaining_amount, interest_rate
              FROM liabilities WHERE household_id = ?`,
        args: [householdId],
      }),

      db.execute({
        sql: `SELECT x.*, 
                json_group_array(DISTINCT json_object(
                  'id', c.id, 'cycle_id', c.cycle_id, 'xitique_id', c.xitique_id,
                  'amount', c.amount, 'paid', c.paid, 'due_date', cy.due_date
                )) as contributions_json,
                json_group_array(DISTINCT json_object(
                  'id', r.id, 'cycle_number', r.cycle_number,
                  'receiver_position', r.receiver_position,
                  'total_received', r.total_received, 'due_date', r.due_date
                )) as cycles_json
              FROM xitiques x
              LEFT JOIN xitique_contributions c ON c.xitique_id = x.id
              LEFT JOIN xitique_cycles cy ON cy.id = c.cycle_id
              LEFT JOIN xitique_cycles r ON r.xitique_id = x.id
              WHERE x.household_id = ? AND x.status = 'active'
              GROUP BY x.id`,
        args: [householdId],
      }),

      db.execute({
        sql: `SELECT h.cash_balance, h.name as household_name,
                s.financial_month_start_day, s.currency, s.user_salary,
                s.daily_entry_reminder_enabled, s.daily_entry_reminder_time,
                s.monthly_due_reminder_enabled, s.monthly_due_reminder_time,
                s.monthly_due_reminder_period, s.housing_type,
                s.default_rent, s.landlord_name, s.subscription_tier,
                s.onboarding_completed
              FROM households h
              LEFT JOIN settings s ON s.household_id = h.id
              WHERE h.id = ?`,
        args: [householdId],
      }),

      db.execute({
        sql: `SELECT id, name, email, avatar_url, role, subscription_tier
              FROM users WHERE household_id = ? LIMIT 1`,
        args: [householdId],
      }),

      db.execute({
        sql: `SELECT d.*, 
                json_group_array(json_object(
                  'id', p.id, 'amount', p.amount, 'payment_date', p.payment_date
                )) FILTER (WHERE p.id IS NOT NULL) as payments_json
              FROM debts d
              LEFT JOIN debt_payments p ON p.debt_id = d.id
              WHERE d.household_id = ?
              GROUP BY d.id`,
        args: [householdId],
      }),

      db.execute({
        sql: `SELECT id, name, type, initial_balance, current_balance
              FROM accounts WHERE household_id = ? ORDER BY current_balance DESC`,
        args: [householdId],
      }),

      db.execute({
        sql: `SELECT * FROM loan_applications WHERE household_id = ? ORDER BY created_at DESC`,
        args: [householdId],
      }),

      db.execute({
        sql: `SELECT * FROM loans WHERE household_id = ? ORDER BY created_at DESC`,
        args: [householdId],
      }),
    ]);

    // ── Normalizar settings (join entre household + settings table) ─────────────
    const settingsRow = settingsResult.rows[0] || {};
    const settings = {
      cash_balance: Number(settingsRow.cash_balance || 0),
      financial_month_start_day: Number(settingsRow.financial_month_start_day || 1),
      currency: settingsRow.currency || 'MT',
      user_salary: Number(settingsRow.user_salary || 0),
      daily_entry_reminder_enabled: settingsRow.daily_entry_reminder_enabled ?? true,
      daily_entry_reminder_time: settingsRow.daily_entry_reminder_time || '20:00',
      monthly_due_reminder_enabled: settingsRow.monthly_due_reminder_enabled ?? true,
      monthly_due_reminder_time: settingsRow.monthly_due_reminder_time || '08:00',
      monthly_due_reminder_period: settingsRow.monthly_due_reminder_period || 'inicio',
      housing_type: settingsRow.housing_type || 'renda',
      default_rent: Number(settingsRow.default_rent || 0),
      landlord_name: settingsRow.landlord_name || '',
      subscription_tier: settingsRow.subscription_tier || 'free',
      onboarding_completed: settingsRow.onboarding_completed ?? false,
    };

    // ── Normalizar dívidas com pagamentos (JSON aggregation) ────────────────────
    const debts = debtsResult.rows.map((d) => {
      let payments = [];
      try {
        payments = d.payments_json ? JSON.parse(d.payments_json) : [];
      } catch {
        payments = [];
      }
      return {
        ...d,
        payments_json: undefined,
        payments,
        total_amount: Number(d.total_amount || 0),
        remaining_amount: Number(d.remaining_amount || 0),
      };
    });

    const summary = {
      transactions: transactionsResult.rows,
      rentals: rentalsResult.rows,
      goals: goalsResult.rows,
      budgets: budgetsResult.rows,
      assets: assetsResult.rows,
      liabilities: liabilitiesResult.rows,
      xitiques: xitiquesResult.rows,
      settings,
      user: userResult.rows[0] || null,
      debts,
      accounts: accountsResult.rows,
      loanApplications: loanApplicationsResult.rows,
      loans: loansResult.rows,
      _meta: {
        generatedAt: new Date().toISOString(),
        householdId,
      },
    };

    // ── Cache com TTL curto — dados financeiros mudam frequentemente ─────────────
    if (redis) {
      try {
        await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(summary));
      } catch (redisError) {
        logger.warn({ err: redisError }, 'Redis cache set failed on dashboard summary');
      }
    }

    res.json(summary);
  } catch (error) {
    logger.error({ err: error, householdId }, 'Error fetching dashboard summary');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Invalida o cache do dashboard para uma household específica.
 * Chamado após qualquer mutação (transaction, debt, goal, etc.).
 */
const invalidateDashboardCache = async (householdId) => {
  if (!redis || !householdId) return;
  try {
    await redis.del(`dashboard:${householdId}`);
  } catch (err) {
    logger.warn({ err, householdId }, 'Failed to invalidate dashboard cache');
  }
};

module.exports = { getDashboardSummary, invalidateDashboardCache };
