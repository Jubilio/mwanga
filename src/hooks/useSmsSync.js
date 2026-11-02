import { ui, useUiLanguage } from '../utils/uiTranslation';
import { useEffect, useCallback } from 'react';
import { getSmsPermission, isSmsInboxSupported, listMoneySms } from '../services/moneySms';
import { ensureSmsAccess } from '../services/smsAccess';
import { useFinance } from './useFinance';
import { parseMobileMoneySMS } from '../utils/smsParser';
import api from '../utils/api';
import { SMS_INBOX_ENABLED, getEffectiveTier } from '../config/features';
import { getSmsQuota } from '../utils/smsQuota';
import { planBalanceSyncs } from '../utils/smsBalance';
import i18n from '../i18n';

export function useSmsSync(showToast) {
  useUiLanguage();
  const { state, dispatch, reloadData } = useFinance();
  const { settings, contas, transacoes } = state;

  const syncSms = useCallback(async (manual = false) => {
    if (!SMS_INBOX_ENABLED) return;
    if (!isSmsInboxSupported()) {
      if (manual) showToast?.(ui("Sincronização SMS só funciona na App Nativa (Android)."), 'error');
      return;
    }

    if (!settings?.sms_automation_enabled && !manual) return;

    try {
      // Automatic syncs never prompt: the explanation sheet only opens when the user asks.
      const granted = manual ? await ensureSmsAccess() : (await getSmsPermission()) === 'granted';
      if (!granted) return;

      // Default to last 7 days if no sync date is found
      const lastSync = settings?.last_sms_sync_date ? new Date(settings.last_sms_sync_date).getTime() : Date.now() - (7 * 24 * 60 * 60 * 1000);

      // Only mobile money and bank SMS come back; the sender filter runs natively.
      const filteredList = await listMoneySms({ minDate: lastSync, maxCount: 200 });

      if (filteredList.length === 0) {
        if (manual) showToast?.(ui("Nenhum SMS novo encontrado."), 'info');
        return;
      }

      let parsedCount = 0;
      const balanceImports = [];
      // Sort oldest first to maintain chronological order
      filteredList.sort((a, b) => a.date - b.date);

      // Free accounts import up to SMS_FREE_MONTHLY_LIMIT a month. When the cap stops the
      // loop, the sync date only advances to the last imported SMS so nothing is skipped.
      const quota = getSmsQuota(getEffectiveTier(settings), transacoes);
      let stoppedAt = null;

      for (const sms of filteredList) {
        if (parsedCount >= quota.remaining) {
          stoppedAt = sms.date;
          break;
        }
        const result = parseMobileMoneySMS(sms.body);
        if (result && result.amount) {
           let accountId = null;
           const bankNameLow = (result.bank_name || '').toLowerCase();
           
           // Try to map to an existing account (an unknown bank must not match every account)
           const matchAccount = bankNameLow
             ? contas?.find(c => c.name.toLowerCase().includes(bankNameLow) || bankNameLow.includes(c.name.toLowerCase()))
             : null;
           
           if (matchAccount) {
             accountId = matchAccount.id;
           } else {
             // Fallbacks based on user settings
             const isIncome = ['receita', 'poupanca', 'transfer_in', 'deposit'].includes(result.type);
             accountId = isIncome ? settings?.default_income_account_id : settings?.default_expense_account_id;
           }

           const uniqueNote = `SMS_REF:${sms.id || sms.date} | TX:${result.transaction_id || 'N/A'}`;
           
           // Avoid Duplicates by checking note or transaction ID
           const exists = transacoes?.some(t => 
              (t.note && t.note.includes(`SMS_REF:${sms.id}`)) || 
              (result.transaction_id && t.note && t.note.includes(`TX:${result.transaction_id}`)) ||
              (result.transaction_id && t.description && t.description.includes(result.transaction_id))
           );

           if (!exists) {
              const isIncome = ['receita', 'poupanca', 'transfer_in', 'deposit'].includes(result.type);
              
              const txData = {
                date: new Date(sms.date).toISOString().split('T')[0],
                type: isIncome ? 'receita' : 'despesa',
                amount: result.amount,
                category: result.category || ui("Outros"),
                description: `${result.description || 'Auto-Sync SMS'} ${result.transaction_id ? `(${result.transaction_id})` : ''}`,
                note: uniqueNote,
                account_id: accountId ? Number(accountId) : null
              };

              try {
                // Already saved here; dispatching ADD_TRANSACTION would post it a second time.
                await api.post('/transactions', txData);
                parsedCount++;
                // Only accounts named after the bank get the SMS balance, never a default account.
                if (matchAccount) {
                  balanceImports.push({ accountId: matchAccount.id, balance: result.balanceAfter, date: txData.date, time: sms.date });
                }
              } catch (err) {
                console.error('Failed to sync individual SMS tx:', err);
              }
           }
        }
      }

      // Set mobile wallet balances to what the newest SMS says is left.
      for (const { accountId, balance } of planBalanceSyncs(balanceImports, transacoes)) {
        try {
          await api.put(`/accounts/${accountId}/balance`, { current_balance: balance });
        } catch (err) {
          console.error('Failed to sync account balance from SMS:', err);
        }
      }

      if (parsedCount > 0) {
        showToast?.(ui("Sucesso! {{p0}} transações importadas do SMS.", { p0: parsedCount }), 'success');
        // Load the new transactions and updated balances into the app.
        await reloadData?.();
      } else {
        if (manual) showToast?.(ui("Nenhuma transação nova identificada."), 'info');
      }

      if (stoppedAt !== null) {
        showToast?.(i18n.t('sms_quota.sync_stopped', { limit: quota.limit, count: parsedCount }), 'info');
      }

      // Update the sync timestamp
      const syncedUntil = stoppedAt !== null ? new Date(stoppedAt - 1) : new Date();
      const newSettings = { ...settings, last_sms_sync_date: syncedUntil.toISOString() };
      dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
      try {
        await api.post('/settings', { key: 'last_sms_sync_date', value: newSettings.last_sms_sync_date });
      } catch (err) {}

    } catch (error) {
      console.error('SMS Sync Error:', error);
      if (manual) showToast?.(ui("Erro ao tentar sincronizar SMS."), 'error');
    }
  }, [settings, contas, transacoes, dispatch, reloadData, showToast]);

  return { syncSms };
}
