/**
 * Balances to set after an SMS inbox sync. For each account matched by bank name,
 * the newest imported SMS that states the balance left wins, unless the account
 * already had a transaction dated after it (an old SMS must not undo a newer balance).
 *
 * @param {Array<{accountId, balance, date: string, time: number}>} imports
 * @param {Array} transacoesBefore transactions as they were before this sync
 * @returns {Array<{accountId, balance}>}
 */
export function planBalanceSyncs(imports = [], transacoesBefore = []) {
  const latest = new Map();
  for (const item of imports) {
    if (!item.accountId || item.balance === null || item.balance === undefined || !Number.isFinite(item.balance)) continue;
    const key = String(item.accountId);
    if (!latest.has(key) || item.time >= latest.get(key).time) latest.set(key, item);
  }
  return [...latest.values()]
    .filter((item) => !transacoesBefore.some((tx) => String(tx.account_id) === String(item.accountId) && String(tx.data || tx.date || '') > item.date))
    .map(({ accountId, balance }) => ({ accountId, balance }));
}
