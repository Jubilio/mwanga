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

describe('parseWithRegex on real messages (2026-11-02)', () => {
  const cases = [
    ['M-Pesa data bundle', 'DJV2M5U6H4I confirmado. Compraste 3.25GB atraves do M-Pesa  no dia 31/10/26 as 9:05 PM no valor de 100.00MT. O novo saldo M-Pesa e de 0.28MT. Em caso de duvida, liga 100. M-Pesa e facil!',
      { bank_name: 'Vodacom M-Pesa', transaction_type: 'payment', amount: 100, transaction_id: 'DJV2M5U6H4I', balance_after: 0.28, transaction_datetime: '2026-10-31T21:05:00' }],
    ['Millennium bim debit', 'A conta 406659018 foi debitada no valor de 1000.00 MZN as 19:00 do dia 31/10/26. Em caso de duvida, ligue 8003500. Millennium bim',
      { bank_name: 'Millennium BIM', transaction_type: 'debit', amount: 1000, account_number: '406659018', transaction_datetime: '2026-10-31T19:00:00' }],
    ['agent cash withdrawal', 'ID Trans: CO261102.1209.T42855. Efetuou um levantamento de 100.00MT no Agente ID 448365, ANIJA AMIMO  as 12:09:38 02/11/2026. Taxa: 3.00MT. Novo saldo: 2,163.16MT. Em caso de duvida, ligue para 100.',
      { transaction_type: 'levantamento', amount: 100, fee_amount: 3, balance_after: 2163.16, transaction_id: 'CO261102.1209.T42855', agent_code: '448365', recipient_name: 'ANIJA AMIMO', transaction_datetime: '2026-11-02T12:09:00' }],
    ['BCI card purchase', 'Caro Cliente, registamos uma compra de 2.580,00 MZN a 31/10/2026 15:46 na(o) CENTRO MED com cartao ***5710. Se nao reconhece, ligue gratis 800224224/(+258)21224224.',
      { bank_name: 'BCI', transaction_type: 'payment', amount: 2580, recipient_name: 'CENTRO MED', transaction_datetime: '2026-10-31T15:46:00' }],
    ['BCI ATM withdrawal', 'Caro Cliente, registamos um levantamento de 3.000,00 MZN a 29/10/2026 14:51 no ATM com cartao ***5710. Se nao reconhece ligue gratis 800224224/(+258)21224224.',
      { bank_name: 'BCI', transaction_type: 'levantamento', amount: 3000, account_number: '***5710', transaction_datetime: '2026-10-29T14:51:00' }],
  ];

  test.each(cases)('%s', (_name, sms, expected) => {
    const result = parseWithRegex(sms);
    expect(result.is_financial).toBe(true);
    expect(result).toMatchObject(expected);
    // Confident enough that the AI fallback is not needed.
    expect(result.confidence_score).toBeGreaterThanOrEqual(0.82);
  });
});

describe('parseMoneyValue', () => {
  test('handles Portuguese and English separators', () => {
    expect(parseMoneyValue('1.585,00')).toBe(1585);
    expect(parseMoneyValue('1,500.00')).toBe(1500);
  });
});
