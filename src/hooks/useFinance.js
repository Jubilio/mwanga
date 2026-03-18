import { useContext } from 'react';
import { FinanceContext } from './useFinanceStore';

export function useFinance() {
  const context = useContext(FinanceContext);

  if (!context) {
    throw new Error('useFinance must be used within FinanceProvider');
  }

  return context;
}
