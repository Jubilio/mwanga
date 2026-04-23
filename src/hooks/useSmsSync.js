import { useEffect, useCallback } from 'react';
import { SMSInboxReader as SmsInbox } from 'capacitor-sms-inbox';
import { Capacitor } from '@capacitor/core';
import { useFinance } from './useFinance';
import { parseMobileMoneySMS } from '../utils/smsParser';
import api from '../utils/api';

export function useSmsSync(showToast) {
  const { state, dispatch } = useFinance();
  const { settings, contas, transacoes } = state;

  const syncSms = useCallback(async (manual = false) => {
    if (!Capacitor.isNativePlatform()) {
      if (manual) showToast?.('Sincronização SMS só funciona na App Nativa (Android).', 'error');
      return;
    }

    if (!settings?.sms_automation_enabled && !manual) return;

    try {
      const permissions = await SmsInbox.checkPermissions();
      if (permissions.sms !== 'granted') {
        const req = await SmsInbox.requestPermissions();
        if (req.sms !== 'granted') {
          if (manual) showToast?.('Permissão de leitura de SMS negada.', 'error');
          return;
        }
      }

      // Default to last 7 days if no sync date is found
      const lastSync = settings?.last_sms_sync_date ? new Date(settings.last_sms_sync_date).getTime() : Date.now() - (7 * 24 * 60 * 60 * 1000);

      const { smsList } = await SmsInbox.getSMSList({
        filter: {
          minDate: lastSync,
          maxCount: 200
        }
      });

      if (!smsList || smsList.length === 0) {
        if (manual) showToast?.('Nenhum SMS novo encontrado.', 'info');
        return;
      }

      let parsedCount = 0;
      const allowedSenders = ['M-Pesa', 'e-Mola', 'Millennium', 'BIM', 'BCI', 'mKesh', 'Absa', 'Standard'];
      
      const filteredList = smsList.filter(sms => 
        allowedSenders.some(sender => sms.address?.toLowerCase().includes(sender.toLowerCase())) ||
        sms.body?.toLowerCase().includes('m-pesa')
      );

      // Sort oldest first to maintain chronological order
      filteredList.sort((a, b) => a.date - b.date);

      for (const sms of filteredList) {
        const result = parseMobileMoneySMS(sms.body);
        if (result && result.amount) {
           let accountId = null;
           const bankNameLow = (result.bank_name || '').toLowerCase();
           
           // Try to map to an existing account
           const matchAccount = contas?.find(c => c.name.toLowerCase().includes(bankNameLow) || bankNameLow.includes(c.name.toLowerCase()));
           
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
                category: result.category || 'Outros',
                description: `${result.description || 'Auto-Sync SMS'} ${result.transaction_id ? `(${result.transaction_id})` : ''}`,
                note: uniqueNote,
                account_id: accountId ? Number(accountId) : null
              };

              try {
                const res = await api.post('/transactions', txData);
                dispatch({ type: 'ADD_TRANSACTION', payload: res.data });
                parsedCount++;
              } catch (err) {
                console.error('Failed to sync individual SMS tx:', err);
              }
           }
        }
      }

      if (parsedCount > 0) {
        showToast?.(`Sucesso! ${parsedCount} transações importadas do SMS.`, 'success');
        // Force refresh accounts to get updated balances
        const accRes = await api.get('/accounts');
        dispatch({ type: 'SET_CONTAS', payload: accRes.data });
      } else {
        if (manual) showToast?.('Nenhuma transação nova identificada.', 'info');
      }

      // Update the sync timestamp
      const newSettings = { ...settings, last_sms_sync_date: new Date().toISOString() };
      dispatch({ type: 'UPDATE_SETTINGS', payload: newSettings });
      try {
        await api.post('/settings', { key: 'last_sms_sync_date', value: newSettings.last_sms_sync_date });
      } catch (err) {}

    } catch (error) {
      console.error('SMS Sync Error:', error);
      if (manual) showToast?.('Erro ao tentar sincronizar SMS.', 'error');
    }
  }, [state.settings, state.contas, state.transacoes, dispatch, showToast]);

  return { syncSms };
}
