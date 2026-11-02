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

  it.each([
    ['M-Pesa purchase', 'DJV2M5U6H4I confirmado. Compraste 3.25GB atraves do M-Pesa  no dia 31/10/26 as 9:05 PM no valor de 100.00MT. O novo saldo M-Pesa e de 0.28MT. Em caso de duvida, liga 100. M-Pesa e facil!',
      { bank_name: 'M-Pesa', type: 'despesa', amount: 100, balanceAfter: 0.28, transaction_id: 'DJV2M5U6H4I', formattedDate: '2026-10-31' }],
    ['agent withdrawal', 'ID Trans: CO261102.1209.T42855. Efetuou um levantamento de 100.00MT no Agente ID 448365, ANIJA AMIMO  as 12:09:38 02/11/2026. Taxa: 3.00MT. Novo saldo: 2,163.16MT. Em caso de duvida, ligue para 100.',
      { bank_name: null, type: 'despesa', amount: 100, balanceAfter: 2163.16, transaction_id: 'CO261102.1209.T42855', formattedDate: '2026-11-02' }],
    ['Millennium bim debit', 'A conta 406659018 foi debitada no valor de 1000.00 MZN as 19:00 do dia 31/10/26. Em caso de duvida, ligue 8003500. Millennium bim',
      { bank_name: 'Millennium bim', amount: 1000, balanceAfter: null, formattedDate: '2026-10-31' }],
    ['BCI ATM withdrawal', 'Caro Cliente, registamos um levantamento de 3.000,00 MZN a 29/10/2026 14:51 no ATM com cartao ***5710. Se nao reconhece ligue gratis 800224224/(+258)21224224.',
      { bank_name: 'BCI', amount: 3000, formattedDate: '2026-10-29' }],
  ])('reads a real %s', (_name, sms, expected) => {
    expect(parseMobileMoneySMS(sms)).toMatchObject(expected);
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
