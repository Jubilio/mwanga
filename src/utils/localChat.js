import { db } from '../db/db';
import { tokenUserId } from './authToken';

// The Binth conversation is kept on the device (IndexedDB). It must never be shown
// to a different person who signs in on the same phone or browser.
const OWNER_KEY = 'mwanga-chat-owner';

function readOwner() {
  try { return localStorage.getItem(OWNER_KEY); } catch { return null; }
}

function writeOwner(id) {
  try {
    if (id) localStorage.setItem(OWNER_KEY, id);
    else localStorage.removeItem(OWNER_KEY);
  } catch { /* storage unavailable */ }
}

// Removes the conversation and the cached personal records. Unsynced offline
// actions (pendingActions) are kept so nothing the user typed is lost: each one
// records its owner and is only sent when that same person signs in again.
// When the account is deleted, pass { forgetPendingOf: userId } to drop them too.
export async function clearLocalUserData({ forgetPendingOf } = {}) {
  writeOwner(null);
  if (forgetPendingOf) {
    try { await db.pendingActions.where('owner').equals(String(forgetPendingOf)).delete(); } catch { /* ignore */ }
  }
  try {
    await Promise.all([
      db.mensagens.clear(),
      db.transacoes.clear(),
      db.budgets.clear(),
      db.metas.clear(),
      db.rendas.clear(),
      db.patrimonio.clear(),
      db.dividas.clear(),
      db.settings.clear(),
    ]);
  } catch { /* IndexedDB unavailable */ }
}

// Call before reading the stored conversation: clears it when it belongs to someone else.
export async function ensureChatOwner(userId = tokenUserId()) {
  const current = userId ? String(userId) : null;
  const owner = readOwner();
  if (owner && current && owner !== current) {
    try { await db.mensagens.clear(); } catch { /* ignore */ }
  }
  if (current) writeOwner(current);
}
