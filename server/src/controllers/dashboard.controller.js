/**
 * Dashboard Summary Controller — v2
 *
 * Agrega os dados de todas as entidades numa única resposta HTTP,
 * substituindo os 13+ chamadas paralelas do frontend por 1 endpoint.
 *
 * Estratégia: queries simples (sem JSON_GROUP_ARRAY) executadas em paralelo
 * no servidor, seguindo o mesmo padrão dos controllers individuais.
 * O pós-processamento (join de payments, xitique sub-data, etc.) é feito
 * em JavaScript — mais portátil e sem depender de funções SQL específicas.
 */

const { db } = require('../config/db');
const redis = require('../utils/redis');
const logger = require('../utils/logger');

const CACHE_TTL_SECONDS = 30;

const getDashboardSummary = async (req, res) => {
  const { householdId, id: userId } = req.user;

  if (!householdId) {
    logger.warn({ userId }, 'Dashboard requested but user has no householdId');
    return res.status(400).json({ error: 'Household ID missing. Please ensure your profile is correctly set up.' });
  }

  // ── Cache check ──────────────────────────────────────────────────────────────
  const cacheKey = `dashboard:${householdId}`;
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
    // ── Fase 1: Todas as queries base em paralelo (queries simples, sem aggregation) ──
    // NOTA: Tabelas que podem não existir em todos os ambientes (debts, xitiques,
    // loan_applications, loans) têm .catch() para evitar que o Promise.all inteiro
    // falhe e retorne 500 ao utilizador.
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
      // Últimas 200 transações — suficiente para cálculos mensais + histórico recente
      db.execute({
        sql: `SELECT id, date, type, description, amount, category, note, account_id
              FROM transactions WHERE household_id = ?
              ORDER BY date DESC, id DESC LIMIT 1000`,
        args: [householdId],
      }).catch((err) => { logger.warn({ err, householdId }, 'dashboard: transactions query failed'); return { rows: [] }; }),

      db.execute({
        sql: `SELECT id, month, landlord, amount, status, notes
              FROM rentals WHERE household_id = ? ORDER BY month DESC`,
        args: [householdId],
      }).catch((err) => { logger.warn({ err }, 'dashboard: rentals query failed'); return { rows: [] }; }),

      db.execute({
        sql: `SELECT id, name, target_amount, saved_amount, deadline, category, monthly_saving
              FROM goals WHERE household_id = ? ORDER BY created_at DESC`,
        args: [householdId],
      }).catch((err) => { logger.warn({ err }, 'dashboard: goals query failed'); return { rows: [] }; }),

      db.execute({
        sql: `SELECT id, category, limit_amount FROM budgets WHERE household_id = ?`,
        args: [householdId],
      }).catch((err) => { logger.warn({ err }, 'dashboard: budgets query failed'); return { rows: [] }; }),

      db.execute({
        sql: `SELECT id, name, type, value FROM assets WHERE household_id = ?`,
        args: [householdId],
      }).catch((err) => { logger.warn({ err }, 'dashboard: assets query failed'); return { rows: [] }; }),

      db.execute({
        sql: `SELECT id, name, total_amount, remaining_amount, interest_rate
              FROM liabilities WHERE household_id = ?`,
        args: [householdId],
      }).catch((err) => { logger.warn({ err }, 'dashboard: liabilities query failed'); return { rows: [] }; }),

      // Apenas xitiques activos — sub-data (cycles/contributions/receipts) buscada abaixo
      db.execute({
        sql: `SELECT * FROM xitiques WHERE household_id = ? AND status = 'active' ORDER BY created_at DESC`,
        args: [householdId],
      }).catch((err) => { logger.warn({ err }, 'dashboard: xitiques query failed'); return { rows: [] }; }),

      // Settings vem do JOIN entre households e settings table
      // .catch() essencial: a tabela 'settings' pode não existir em todos os ambientes
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
      }).catch((err) => { logger.warn({ err }, 'dashboard: settings query failed'); return { rows: [] }; }),

      db.execute({
        sql: `SELECT id, name, email, avatar_url, role, subscription_tier, whatsapp_number
              FROM users WHERE id = ?`,
        args: [userId],
      }).catch((err) => { logger.warn({ err, userId }, 'dashboard: user query failed'); return { rows: [] }; }),

      // Dívidas sem payments — buscados separadamente abaixo
      db.execute({
        sql: `SELECT * FROM debts WHERE household_id = ? ORDER BY created_at DESC`,
        args: [householdId],
      }).catch((err) => { logger.warn({ err }, 'dashboard: debts query failed'); return { rows: [] }; }),

      db.execute({
        sql: `SELECT id, name, type, initial_balance, current_balance
              FROM accounts WHERE household_id = ? ORDER BY current_balance DESC`,
        args: [householdId],
      }).catch((err) => { logger.warn({ err }, 'dashboard: accounts query failed'); return { rows: [] }; }),

      // Loan applications — tabela pode não existir em todos os ambientes
      db.execute({
        sql: `SELECT * FROM loan_applications WHERE household_id = ? ORDER BY created_at DESC`,
        args: [householdId],
      }).catch(() => ({ rows: [] })),

      db.execute({
        sql: `SELECT * FROM loans WHERE household_id = ? ORDER BY created_at DESC`,
        args: [householdId],
      }).catch(() => ({ rows: [] })),
    ]);

    // ── Fase 2: Queries dependentes dos IDs da fase 1 ───────────────────────────

    // Payments de dívidas — mesmo padrão do debtController
    // Wrapped in try/catch: debt_payments table may not exist
    let debtsWithPayments = debtsResult.rows;
    if (debtsResult.rows.length > 0) {
      try {
        const debtIds = debtsResult.rows.map(d => d.id);
        const placeholders = debtIds.map(() => '?').join(', ');
        const paymentsResult = await db.execute({
          sql: `SELECT * FROM debt_payments WHERE debt_id IN (${placeholders}) ORDER BY payment_date DESC`,
          args: debtIds,
        });

        const paymentsByDebt = paymentsResult.rows.reduce((acc, p) => {
          if (!acc[p.debt_id]) acc[p.debt_id] = [];
          acc[p.debt_id].push(p);
          return acc;
        }, {});

        debtsWithPayments = debtsResult.rows.map(debt => ({
          ...debt,
          total_amount: Number(debt.total_amount || 0),
          remaining_amount: Number(debt.remaining_amount || 0),
          payments: (paymentsByDebt[debt.id] || []).map(p => ({
            ...p,
            amount: Number(p.amount || 0),
          })),
        }));
      } catch (err) {
        logger.warn({ err }, 'dashboard: debt_payments sub-query failed, returning debts without payments');
        debtsWithPayments = debtsResult.rows.map(debt => ({
          ...debt,
          total_amount: Number(debt.total_amount || 0),
          remaining_amount: Number(debt.remaining_amount || 0),
          payments: [],
        }));
      }
    }

    // Sub-data de xitiques — mesmo padrão do xitiqueController
    // Wrapped in try/catch: xitique sub-tables may not exist
    let xitiquesWithData = xitiquesResult.rows;
    if (xitiquesResult.rows.length > 0) {
      try {
        const xIds = xitiquesResult.rows.map(x => x.id);
        const xPlaceholders = xIds.map(() => '?').join(', ');

        const [cyclesRes, contribRes, receiptsRes] = await Promise.all([
          db.execute({ sql: `SELECT * FROM xitique_cycles WHERE xitique_id IN (${xPlaceholders})`, args: xIds }).catch(() => ({ rows: [] })),
          db.execute({ sql: `SELECT * FROM xitique_contributions WHERE xitique_id IN (${xPlaceholders})`, args: xIds }).catch(() => ({ rows: [] })),
          db.execute({ sql: `SELECT * FROM xitique_receipts WHERE xitique_id IN (${xPlaceholders})`, args: xIds }).catch(() => ({ rows: [] })),
        ]);

        const groupBy = (rows, key) => rows.reduce((map, row) => {
          const k = row[key];
          (map[k] = map[k] || []).push(row);
          return map;
        }, {});

        const cyclesMap = groupBy(cyclesRes.rows, 'xitique_id');
        const contribMap = groupBy(contribRes.rows, 'xitique_id');
        const receiptsMap = groupBy(receiptsRes.rows, 'xitique_id');

        xitiquesWithData = xitiquesResult.rows.map(x => ({
          ...x,
          cycles: cyclesMap[x.id] || [],
          contributions: contribMap[x.id] || [],
          receipts: receiptsMap[x.id] || [],
        }));
      } catch (err) {
        logger.warn({ err }, 'dashboard: xitique sub-queries failed, returning xitiques without sub-data');
        xitiquesWithData = xitiquesResult.rows.map(x => ({
          ...x,
          cycles: [],
          contributions: [],
          receipts: [],
        }));
      }
    }

    // ── Fase 3: Normalizar settings ──────────────────────────────────────────────
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
      // subscription_tier vem da tabela real — nunca do default
      subscription_tier: settingsRow.subscription_tier || 'free',
      onboarding_completed: settingsRow.onboarding_completed ?? false,
    };

    // ── Fase 4: Montar resposta final ────────────────────────────────────────────
    const summary = {
      transactions: transactionsResult.rows,
      rentals: rentalsResult.rows,
      goals: goalsResult.rows,
      budgets: budgetsResult.rows,
      assets: assetsResult.rows,
      liabilities: liabilitiesResult.rows,
      xitiques: xitiquesWithData,
      settings,
      user: userResult.rows[0] || null,
      debts: debtsWithPayments,
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
    res.status(500).json({
      error: 'Erro interno do servidor',
      detail: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Invalida o cache do dashboard para uma household específica.
 * Deve ser chamado após qualquer mutação (transação, meta, dívida, etc.).
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
