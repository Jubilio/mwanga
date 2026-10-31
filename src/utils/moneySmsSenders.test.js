import { describe, expect, it } from 'vitest';
import { isMoneySms } from './moneySmsSenders';

describe('mobile money SMS filter', () => {
  it('accepts mobile money and bank senders in any spelling', () => {
    for (const address of ['M-PESA', 'MPESA', 'e-Mola', 'EMOLA', 'mKesh', 'Millennium', 'BCI', 'ABSA', 'StandardBk']) {
      expect(isMoneySms({ address, body: 'Confirmado' })).toBe(true);
    }
  });

  it('accepts M-Pesa and BCI card alerts sent from short codes', () => {
    expect(isMoneySms({ address: '84200', body: 'Vodacom M-Pesa: Levantaste 2,000MT' })).toBe(true);
    expect(isMoneySms({ address: '8000', body: 'Compra de 1.585,00 MZN. Ligue gratis 800224224' })).toBe(true);
  });

  it('rejects personal messages', () => {
    expect(isMoneySms({ address: '+258841234567', body: 'Ola! Chego as 18h' })).toBe(false);
    expect(isMoneySms({ address: 'Mae', body: 'Liga-me' })).toBe(false);
    expect(isMoneySms(null)).toBe(false);
  });
});
