import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { ui, uiLocale, uiCategory, uiTransactionType } from './uiTranslation';
import { getMonthLabel, fmt } from './calculations';
import { getPaymentMethodLabel } from './paymentMethods';

afterEach(() => i18n.changeLanguage('pt'));

describe('complete interface localization', () => {
  it('updates static labels and formatting when switching languages without reloading', async () => {
    await i18n.changeLanguage('pt');
    const oldLabel = ui('Taxa de poupança');
    await i18n.changeLanguage('en');
    expect(ui(oldLabel)).toBe('Savings rate');
    expect(getPaymentMethodLabel('dinheiro')).toBe('Cash');
    expect(getMonthLabel('2026-02')).toBe('February 2026');
    expect(uiLocale()).toBe('en-GB');
    expect(fmt(1250.5)).toBe('1,250.50 MT');
    await i18n.changeLanguage('pt');
    expect(getMonthLabel('2026-02')).toBe('Fevereiro 2026');
    expect(getPaymentMethodLabel('dinheiro')).toBe('Dinheiro');
    expect(uiLocale()).toBe('pt-MZ');
    expect(fmt(1250.5)).toBe('1.250,50 MT');
  });

  it('translates confirmation actions and interpolated system messages', async () => {
    await i18n.changeLanguage('en');
    expect(ui('Sim, registar agora')).toBe('Yes, record now');
    expect(ui('Reconhecimento de voz sem rede — tentando novamente ({{p0}}/2)...', { p0: 1 }))
      .toBe('Voice recognition is offline — retrying (1/2)...');
    expect(ui('{{count}} utilizadores registados', { count: 3 })).toBe('3 registered users');
  });

  it('preserves financial codes, unknown user text and non-text values', async () => {
    await i18n.changeLanguage('en');
    expect(ui('receita')).toBe('receita');
    expect(uiTransactionType('receita')).toContain('Income');
    expect(uiCategory('Alimentação')).toBe('Food');
    expect(ui('Almoço com a família na minha casa')).toBe('Almoço com a família na minha casa');
    expect(ui(123)).toBe(123);
    expect(ui(null)).toBe(null);
    expect(getPaymentMethodLabel('mpesa')).toBe('M-Pesa');
  });
});
