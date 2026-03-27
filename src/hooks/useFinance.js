import { useContext } from 'react';
import { FinanceContext } from './FinanceContext';

export function useFinance() {
  const context = useContext(FinanceContext);

  if (!context) {
    throw new Error('useFinance must be used within FinanceProvider');
  }

  return context;
}
