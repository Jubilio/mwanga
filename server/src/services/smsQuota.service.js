const { db } = require('../config/db');

// Igual a src/utils/smsQuota.js na app: as transacções importadas de SMS são
// reconhecidas pela nota ("... | SMS: <texto>" na página de importação,
// "SMS_REF:" na sincronização Android). O plano grátis tem um limite mensal.
const SMS_FREE_MONTHLY_LIMIT = 30;
const SMS_NOTE = /(^|\|\s*)SMS(_REF)?:/;
const SMS_NOTE_SQL = '(^|\\|\\s*)SMS(_REF)?:';

const isSmsNote = (note) => typeof note === 'string' && SMS_NOTE.test(note);

/** Plano pago ainda válido, ou período de teste a decorrer. */
function hasUnlimitedSms(settings = {}, now = new Date()) {
  const tier = settings.subscription_tier || 'free';
  if (tier !== 'free') {
    const expires = settings.subscription_expires_at ? new Date(settings.subscription_expires_at) : null;
    if (!expires || Number.isNaN(expires.getTime()) || expires > now) return true;
  }
  const trialEnds = settings.trial_ends_at ? new Date(settings.trial_ends_at) : null;
  return Boolean(trialEnds && !Number.isNaN(trialEnds.getTime()) && trialEnds > now);
}

/**
 * Lança SMS_LIMIT_REACHED se a família do plano grátis já importou o máximo
 * de SMS deste mês. Só é chamado para transacções com nota de SMS.
 */
async function assertSmsQuota(householdId, now = new Date()) {
  const settingsResult = await db.execute({
    sql: `SELECT key, value FROM settings WHERE household_id = ?
          AND key IN ('subscription_tier', 'subscription_expires_at', 'trial_ends_at')`,
    args: [householdId],
  });
  const settings = Object.fromEntries(settingsResult.rows.map((row) => [row.key, row.value]));
  if (hasUnlimitedSms(settings, now)) return;

  const month = now.toISOString().slice(0, 7);
  const countResult = await db.execute({
    sql: `SELECT COUNT(*)::int AS count FROM transactions
          WHERE household_id = ? AND LEFT(CAST(date AS TEXT), 7) = ? AND note ~ ?`,
    args: [householdId, month, SMS_NOTE_SQL],
  });
  if (Number(countResult.rows[0]?.count || 0) >= SMS_FREE_MONTHLY_LIMIT) {
    const error = new Error('SMS_LIMIT_REACHED');
    error.limit = SMS_FREE_MONTHLY_LIMIT;
    throw error;
  }
}

module.exports = { SMS_FREE_MONTHLY_LIMIT, isSmsNote, hasUnlimitedSms, assertSmsQuota };
