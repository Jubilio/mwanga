import { useEffect } from 'react';

export function useClipboardSMS(onParse) {
  useEffect(() => {
    const handlePaste = (e) => {
      // Ignore paste if focus is inside an input or textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      const text = (e.clipboardData || window.clipboardData).getData('text');
      // Simple heuristic for bank SMS (e.g., M-Pesa, Millennium bim, Standard Bank, BCI)
      if (text && (text.includes('M-Pesa') || text.includes('Kosh') || text.match(/\bMT\b/))) {
        onParse(text);
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onParse]);
}
