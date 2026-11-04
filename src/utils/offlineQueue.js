import { db } from '../db/db';
import { tokenUserId } from './authToken';

// Offline write queue.
//
// Every queued action records who created it (owner = user id from the session
// token) and a request id. The request id travels as the Idempotency-Key header,
// so the server saves the action once even if it is sent again. Sync only sends
// the actions of the person who is signed in now.

export function newRequestId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch { /* fall through */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`;
}

// Turns any text into a valid key (letters, digits, - and _; 8 to 100 characters).
export function toRequestId(text) {
  const clean = String(text || '').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 100);
  return clean.length >= 8 ? clean : null;
}

// The HTTP request for each queued action type. Used both when writing online and
// when replaying the queue, so the two can never disagree.
export function describeRequest(type, payload) {
  switch (type) {
    case 'ADD_TRANSACTION': return { endpoint: 'transactions', method: 'POST', body: payload };
    case 'UPDATE_TRANSACTION': return { endpoint: `transactions/${payload.id}`, method: 'PUT', body: payload };
    case 'DELETE_TRANSACTION': return { endpoint: `transactions/${payload}`, method: 'DELETE' };
    case 'ADD_RENDA': return { endpoint: 'rentals', method: 'POST', body: payload };
    case 'ADD_META': return { endpoint: 'goals', method: 'POST', body: payload };
    case 'UPDATE_META': {
      const { id, ...body } = payload;
      return { endpoint: `goals/${id}`, method: 'PUT', body };
    }
    case 'ADD_DEBT': return { endpoint: 'debts', method: 'POST', body: payload };
    case 'UPDATE_DEBT': {
      const { id, ...body } = payload;
      return { endpoint: `debts/${id}`, method: 'PUT', body };
    }
    case 'PAY_DEBT': return {
      endpoint: `debts/${payload.debtId}/pay`,
      method: 'POST',
      body: { amount: payload.amount, account_id: payload.account_id, payment_date: payload.payment_date },
    };
    case 'ADD_XITIQUE': return { endpoint: 'xitiques', method: 'POST', body: payload };
    case 'DELETE_XITIQUE': return { endpoint: `xitiques/${payload}`, method: 'DELETE' };
    case 'PAY_XITIQUE': return {
      endpoint: `xitiques/pay/${payload.contributionId}`,
      method: 'POST',
      body: { date: payload.date, account_id: payload.account_id },
    };
    case 'RECEIVE_XITIQUE': return {
      endpoint: `xitiques/receive/${payload.receiptId}`,
      method: 'POST',
      body: { date: payload.date, account_id: payload.account_id },
    };
    default: return null;
  }
}

export const QUEUEABLE_TYPES = [
  'ADD_TRANSACTION', 'UPDATE_TRANSACTION', 'DELETE_TRANSACTION', 'ADD_RENDA', 'ADD_META', 'UPDATE_META',
  'ADD_DEBT', 'UPDATE_DEBT', 'PAY_DEBT', 'ADD_XITIQUE', 'DELETE_XITIQUE', 'PAY_XITIQUE', 'RECEIVE_XITIQUE',
];

// True when the request never got an answer, or the server could not handle it
// right now. Those writes are safe to queue: the request id stops duplicates.
export function isRetryableError(err) {
  if (!err) return false;
  const status = Number(err.status ?? err.response?.status ?? 0);
  if (!status) return true; // no response: offline, DNS, timeout
  if (status === 409) return err.code !== 'ALREADY_PAID';
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export async function enqueueAction(type, payload, requestId = newRequestId(), owner = tokenUserId()) {
  if (!owner) throw new Error('No signed-in user for the offline action');
  await db.pendingActions.add({ type, payload, requestId, owner: String(owner), timestamp: Date.now() });
  return requestId;
}

// Actions that belong to `owner`, oldest first.
export async function pendingActionsFor(owner) {
  if (!owner) return [];
  const rows = await db.pendingActions.where('owner').equals(String(owner)).toArray();
  return rows.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0) || (a.id || 0) - (b.id || 0));
}

export async function countPendingFor(owner) {
  if (!owner) return 0;
  return db.pendingActions.where('owner').equals(String(owner)).count();
}

// Actions saved before owners were recorded cannot be attributed to anyone, so
// they are never sent with another person's session.
export async function dropUnownedActions() {
  try {
    const all = await db.pendingActions.toArray();
    const orphans = all.filter(a => !a.owner).map(a => a.id);
    if (orphans.length) await db.pendingActions.bulkDelete(orphans);
    return orphans.length;
  } catch {
    return 0;
  }
}

// Saves one write and says what happened:
//   'saved'        the server confirmed it
//   'queued'       no answer from the server; it waits in the offline queue
//   'already_done' the server says it was already recorded (e.g. debt settled)
// A refusal from the server (bad data, no access) is thrown to the caller.
// The write and the screen refresh are separate steps: a refresh that fails after
// a confirmed write never puts the write back in the queue.
export async function saveWrite({ type, payload, requestId = newRequestId(), apiCall, refresh, onQueued, onRefreshFailed }) {
  const request = describeRequest(type, payload);
  if (!request) throw new Error(`No request for ${type}`);
  try {
    await apiCall(request.endpoint, request.method, request.body ?? null, { 'Idempotency-Key': requestId });
  } catch (err) {
    if (err?.code === 'ALREADY_PAID') {
      try { await refresh?.(); } catch { /* the next full reload shows it */ }
      return 'already_done';
    }
    if (!isRetryableError(err)) throw err;
    await enqueueAction(type, payload, requestId);
    try { await onQueued?.(); } catch { /* local cache only */ }
    return 'queued';
  }
  try {
    await refresh?.();
  } catch {
    try { await onRefreshFailed?.(); } catch { /* ignore */ }
  }
  return 'saved';
}
