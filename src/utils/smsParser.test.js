import { describe, expect, it } from 'vitest';
import { parseAmount, parseMobileMoneySMS } from './smsParser';

const BCI_CARD_SMS = 'Caro Cliente, registamos uma compra de 1.585,00 MZN a 30/10/2026 19:29 na(o) CAPUCCINO com cartao ***5710. Se nao reconhece, ligue gratis 800224224/(+258)21224224.';

describe('parseMobileMoneySMS', () => {
  it('reads a BCI card purchase', () => {
    expect(parseMobileMoneySMS(BCI_CARD_SMS)).toMatchObject({
      service: 'BCI',
      bank_name: 'BCI',
      type: 'despesa',
      amount: 1585,
      description: 'BCI: CAPUCCINO',
      card: '***5710',
      formattedDate: '2026-10-30'
    });
  });

  it('still reads an M-Pesa payment with English separators', () => {
    const result = parseMobileMoneySMS('Pagamento de 1,250.50MT a Loja Central. Saldo actual: 3,000.00MT');
    expect(result).toMatchObject({ service: 'M-Pesa', type: 'despesa', amount: 1250.5, balanceAfter: 3000 });
  });

  it('returns null for messages that are not transactions', () => {
    expect(parseMobileMoneySMS('Ola! A tua encomenda chegou.')).toBeNull();
  });
});

describe('parseAmount', () => {
  it('treats the last separator as the decimal one', () => {
    expect(parseAmount('1.585,00')).toBe(1585);
    expect(parseAmount('1,500.00')).toBe(1500);
    expect(parseAmount('200')).toBe(200);
  });
});
