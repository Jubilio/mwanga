import { useEffect, useCallback } from 'react';
import { db } from '../db/db';

export function useOfflineSync(FINANCE_API_URL, dispatch, reloadData) {
  
  const processPendingActions = useCallback(async () => {
    const token = localStorage.getItem('mwanga-token');
    if (!token) return;

    const pending = await db.pendingActions.toArray();
    if (pending.length === 0) return;

    console.log(`[Sync] A processar ${pending.length} acções pendentes...`);

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    for (const action of pending) {
      try {
        let resp;
        switch (action.type) {
          case 'ADD_TRANSACTION':
            resp = await fetch(`${FINANCE_API_URL}/transactions`, {
              method: 'POST',
              headers,
              body: JSON.stringify(action.payload)
            });
            break;
          case 'UPDATE_TRANSACTION':
            resp = await fetch(`${FINANCE_API_URL}/transactions/${action.payload.id}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify(action.payload)
            });
            break;
          case 'DELETE_TRANSACTION':
            resp = await fetch(`${FINANCE_API_URL}/transactions/${action.payload}`, {
              method: 'DELETE',
              headers
            });
            break;
          case 'ADD_DEBT':
            resp = await fetch(`${FINANCE_API_URL}/debts`, {
              method: 'POST',
              headers,
              body: JSON.stringify(action.payload)
            });
            break;
          case 'PAY_DEBT':
            resp = await fetch(`${FINANCE_API_URL}/debts/${action.payload.debtId}/pay`, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                amount: action.payload.amount,
                account_id: action.payload.account_id,
                payment_date: action.payload.payment_date
              })
            });
            break;
          default:
            console.warn(`[Sync] Acção desconhecida: ${action.type}`);
            await db.pendingActions.delete(action.id);
            continue;
        }

        if (resp && resp.ok) {
          await db.pendingActions.delete(action.id);
          console.log(`[Sync] Sucesso: ${action.type}`);
        } else if (resp && resp.status === 401) {
          // Token expirado, parar sincronização
          return;
        }
      } catch (err) {
        console.error(`[Sync] Erro ao processar ${action.type}:`, err.message);
        break; // Provavelmente ainda sem internet, tentar mais tarde
      }
    }

    // Se processamos algo, recarrega os dados globais para garantir consistência
    if ((await db.pendingActions.count()) < pending.length) {
      reloadData();
    }
  }, [FINANCE_API_URL, reloadData]);

  // Tentar sincronizar quando a ligação volta ao normal
  useEffect(() => {
    window.addEventListener('online', processPendingActions);
    return () => window.removeEventListener('online', processPendingActions);
  }, [processPendingActions]);

  // Tentar sincronizar periodicamente (a cada 1 minuto se estiver online)
  useEffect(() => {
    const interval = setInterval(() => {
      if (navigator.onLine) {
        processPendingActions();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [processPendingActions]);

  return { processPendingActions };
}
