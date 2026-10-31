import { SMS_FREE_MONTHLY_LIMIT, SUBSCRIPTION_TIERS } from '../config/features';

// Imported SMS are recognised by the marker each import path writes in the note:
// the SMS import page ends it with "SMS: <texto>", the Android sync starts it with "SMS_REF:".
const SMS_NOTE = /(^|\|\s*)SMS(_REF)?:/;

export function isSmsTransaction(transaction = {}) {
  const note = transaction.nota ?? transaction.note ?? '';
  return typeof note === 'string' && SMS_NOTE.test(note);
}

function monthKey(value) {
  if (!value) return null;
  return String(value).slice(0, 7);
}

/** SMS imports dated in the current calendar month. */
export function countSmsThisMonth(transactions = [], now = new Date()) {
  const current = now.toISOString().slice(0, 7);
  return transactions.filter((t) => isSmsTransaction(t) && monthKey(t.data ?? t.date) === current).length;
}

/**
 * Monthly SMS allowance. Free accounts get SMS_FREE_MONTHLY_LIMIT per month;
 * every paid tier (and an active trial) is unlimited.
 */
export function getSmsQuota(tier, transactions = [], now = new Date(), extraUsed = 0) {
  if (tier && tier !== SUBSCRIPTION_TIERS.FREE) {
    return { limited: false, used: 0, remaining: Infinity, limit: null };
  }
  const used = countSmsThisMonth(transactions, now) + extraUsed;
  return {
    limited: true,
    used,
    remaining: Math.max(0, SMS_FREE_MONTHLY_LIMIT - used),
    limit: SMS_FREE_MONTHLY_LIMIT,
  };
}
