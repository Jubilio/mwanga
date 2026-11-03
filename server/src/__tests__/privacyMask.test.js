const { maskFreeText, maskLabel, maskDeep } = require('../utils/privacyMask');

describe('privacy mask', () => {
  test('hides phones, e-mails, cards and account numbers in chat text', () => {
    const text = 'Liga para +258 84 123 4567 ou 841234567, email ana@mail.co.mz, cartão 4111 1111 1111 1111, NUIT 123456789';
    const masked = maskFreeText(text);
    expect(masked).not.toMatch(/4567|841234567|ana@|4111|123456789/);
    expect(masked).toContain('[telefone]');
    expect(masked).toContain('[email]');
  });

  test('keeps amounts in chat text', () => {
    expect(maskFreeText('ganhei 1500000 e gastei 25.000 MT')).toBe('ganhei 1500000 e gastei 25.000 MT');
  });

  test('labels hide shorter references and are cut', () => {
    expect(maskLabel('Transferência ref 4839201 para 82 765 4321')).toBe('Transferência ref [número] para [telefone]');
    expect(maskLabel('x'.repeat(100), 40)).toHaveLength(40);
  });

  test('masks every string inside tool results', () => {
    expect(maskDeep({ creditor: 'Banco 845556677', items: [{ note: 'ana@x.com' }], amount: 500 }))
      .toEqual({ creditor: 'Banco [telefone]', items: [{ note: '[email]' }], amount: 500 });
  });
});
