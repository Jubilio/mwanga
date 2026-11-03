import { useEffect, useCallback, useRef } from 'react';
import { db } from '../db/db';
import { getToken, tokenUserId } from '../utils/authToken';
import { describeRequest, dropUnownedActions, pendingActionsFor, toRequestId } from '../utils/offlineQueue';

// Sends the signed-in person's queued actions, oldest first.
// - Only actions whose owner matches the current session are sent.
// - Each request carries the action's Idempotency-Key, so a replay is saved once.
// - An action is removed only after the server confirms it, or refuses it for good.
export async function syncPendingActions({ apiUrl, token = getToken(), owner = tokenUserId(token), fetchImpl = fetch }) {
  const result = { sent: 0, dropped: 0, remaining: 0, stopped: null };
  if (!token || !owner) return result;

  await dropUnownedActions();
  const pending = await pendingActionsFor(owner);

  for (let i = 0; i < pending.length; i += 1) {
    const action = pending[i];
    // The person may have signed out or switched account mid-sync.
    if (getToken() !== token) { result.stopped = 'session_changed'; break; }

    const request = describeRequest(action.type, action.payload);
    if (!request) {
      console.error(`[Sync] Tipo de acção sem sincronização: ${action.type}. Mantida na fila.`);
      continue;
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': toRequestId(action.requestId) || `legacy-${action.id}-${action.timestamp || 0}`,
    };

    let resp;
    try {
      resp = await fetchImpl(`${apiUrl}/${request.endpoint}`, {
        method: request.method,
        headers,
        body: request.body === undefined ? undefined : JSON.stringify(request.body),
      });
    } catch (err) {
      console.warn(`[Sync] Sem ligação ao enviar ${action.type}:`, err?.message);
      result.stopped = 'offline';
      break;
    }

    if (resp.ok) {
      await db.pendingActions.delete(action.id);
      result.sent += 1;
      continue;
    }
    if (resp.status === 401) {
      result.stopped = 'unauthorized';
      break;
    }
    let code = null;
    try { code = (await resp.json())?.code || null; } catch { /* no body */ }
    if (resp.status === 409 && code === 'ALREADY_PAID') {
      await db.pendingActions.delete(action.id);
      result.sent += 1;
      continue;
    }
    if (resp.status === 408 || resp.status === 409 || resp.status === 425 || resp.status === 429 || resp.status >= 500) {
      // Server busy or still finishing the same request: keep it and try later.
      result.stopped = 'retry_later';
      break;
    }
    // The server refused the data itself (400, 404, 422...). Sending it again cannot work.
    console.error(`[Sync] O servidor recusou ${action.type} (${resp.status}). Acção descartada.`);
    await db.pendingActions.delete(action.id);
    result.dropped += 1;
  }

  result.remaining = (await pendingActionsFor(owner)).length;
  return result;
}

export function useOfflineSync(FINANCE_API_URL, _dispatch, reloadData) {
  const running = useRef(false);

  const processPendingActions = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      const result = await syncPendingActions({ apiUrl: FINANCE_API_URL });
      if (result.sent || result.dropped) reloadData();
    } catch (err) {
      console.error('[Sync] Falha ao sincronizar:', err?.message);
    } finally {
      running.current = false;
    }
  }, [FINANCE_API_URL, reloadData]);

  // Tentar sincronizar quando a ligação volta ao normal
  useEffect(() => {
    window.addEventListener('online', processPendingActions);
    return () => window.removeEventListener('online', processPendingActions);
  }, [processPendingActions]);

  // Tentar sincronizar ao abrir e periodicamente (a cada 1 minuto se estiver online)
  useEffect(() => {
    if (navigator.onLine) processPendingActions();
    const interval = setInterval(() => {
      if (navigator.onLine) {
        processPendingActions();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [processPendingActions]);

  return { processPendingActions };
}
