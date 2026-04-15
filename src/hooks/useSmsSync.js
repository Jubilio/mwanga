import { useEffect, useCallback } from 'react';
import { useFinance } from './useFinance';

/**
 * Hook to listen for SMS events from the native Android bridge
 * and trigger automated parsing and reconciliation.
 * (Native bridge removed - keeping hook for potential Web Share Target integration)
 */
export function useSmsSync() {
  const { state, dispatch, reloadData } = useFinance();
  const settings = state?.settings;

  const handleSmsDetected = useCallback(async (event) => {
    // 1. Check if automation is enabled in settings
    if (!settings) return;
    
    const isEnabled = settings.sms_automation_enabled === 'true' || settings.sms_automation_enabled === true;
    if (!isEnabled) return;

    try {
      const { sender, body } = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail;
      console.log('SMS received:', sender);

      // 2. Call backend to parse the SMS
      const token = localStorage.getItem('mwanga-token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/sms/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ raw_text: body })
      });

      if (!response.ok) return;

      const result = await response.json();
      const parsed = result.data.parsed_data;

      // 3. If confidence is high and it's financial, suggest adding it
      if (parsed && parsed.is_financial && parsed.confidence_score >= 0.8) {
        const amountStr = new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: parsed.currency || 'MZN' }).format(parsed.amount);
        
        // Use a simple confirm for now (can be replaced with a custom modal)
        const confirmed = window.confirm(
          `Mwanga ✦ - Transação Detetada\n\n` +
          `${parsed.bank_name || 'Banco'}: ${parsed.transaction_type.toUpperCase()}\n` +
          `Valor: ${amountStr}\n\n` +
          `Deseja registar esta operação e reconciliar o saldo?`
        );

        if (confirmed) {
          // 4. Create the transaction
          await dispatch({
            type: 'ADD_TRANSACTION',
            payload: {
              data: parsed.transaction_datetime.slice(0, 10),
              tipo: parsed.transaction_type, // 'levantamento', 'deposito', 'despesa', 'receita'
              desc: `${parsed.bank_name || ''} - ${parsed.transaction_type.toUpperCase()}`,
              valor: parsed.amount,
              cat: parsed.transaction_type === 'levantamento' ? 'Transferência' : 'Outros',
              nota: `Auto-sincronizado via SMS (${parsed.transaction_id || ''})`,
              account_id: null // User might need to select an account later or we auto-detect
            }
          });

          // 5. Reload data to refresh balances
          await reloadData();
          
          alert('Transação registada com sucesso!');
        }
      }
    } catch (error) {
      console.error('Error processing automated SMS:', error);
    }
  }, [settings, dispatch, reloadData]);

  useEffect(() => {
    // Note: On web/pwa, 'smsReceived' is not a standard event.
    // This hook is currently inactive but kept for future web-based integrations.
    window.addEventListener('smsReceived', handleSmsDetected);

    return () => {
      window.removeEventListener('smsReceived', handleSmsDetected);
    };
  }, [handleSmsDetected]);

  return null;
}
