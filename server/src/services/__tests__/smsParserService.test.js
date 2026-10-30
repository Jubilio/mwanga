const { parseWithRegex, parseMoneyValue } = require('../smsParserService');

const BCI_CARD_SMS = 'Caro Cliente, registamos uma compra de 1.585,00 MZN a 30/10/2026 19:29 na(o) CAPUCCINO com cartao ***5710. Se nao reconhece, ligue gratis 800224224/(+258)21224224.';

describe('parseWithRegex', () => {
  test('reads a BCI card purchase that never names the bank', () => {
    const result = parseWithRegex(BCI_CARD_SMS);

    expect(result.is_financial).toBe(true);
    expect(result.bank_name).toBe('BCI');
    expect(result.transaction_type).toBe('payment');
    expect(result.amount).toBe(1585);
    expect(result.currency).toBe('MZN');
    expect(result.recipient_name).toBe('CAPUCCINO');
    expect(result.account_number).toBe('***5710');
    expect(result.transaction_datetime).toBe('2026-10-30T19:29:00');
    // High enough to skip the LLM fallback.
    expect(result.confidence_score).toBeGreaterThanOrEqual(0.82);
  });

  test('still reads a BCI account credit', () => {
    const result = parseWithRegex('BCI: A sua conta 00123456-7 foi creditada com 45,000.00MZN em 24/02/2026 as 09:30. Referencia: SAL-2026-002');

    expect(result.bank_name).toBe('BCI');
    expect(result.transaction_type).toBe('credit');
    expect(result.amount).toBe(45000);
    expect(result.account_number).toBe('00123456-7');
  });

  test('ignores messages that are not financial', () => {
    const result = parseWithRegex('Ola! A tua encomenda chegou. Levanta na loja mais proxima com o codigo 8821.');
    expect(result.is_financial).toBe(false);
  });
});

describe('parseMoneyValue', () => {
  test('handles Portuguese and English separators', () => {
    expect(parseMoneyValue('1.585,00')).toBe(1585);
    expect(parseMoneyValue('1,500.00')).toBe(1500);
  });
});
