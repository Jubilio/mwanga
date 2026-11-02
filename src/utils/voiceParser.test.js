import { describe, it, expect } from 'vitest';
import { parseVoiceTransaction } from './voiceParser';

const now = new Date(2026, 10, 2, 10, 0, 0);
const accounts = [
  { id: 1, name: 'M-Pesa' },
  { id: 2, name: 'e-Mola' },
  { id: 3, name: 'Carteira' },
  { id: 4, name: 'BCI' },
];
const parse = (text) => parseVoiceTransaction(text, { accounts, now });

describe('parseVoiceTransaction', () => {
  it('reads amount, category and description from a simple expense', () => {
    expect(parse('gastei 200 meticais em pão')).toMatchObject({
      valor: 200, tipo: 'despesa', cat: 'food', desc: 'Pão', data: '2026-11-02', account_id: null,
    });
  });

  it('picks the account and drops it from the description', () => {
    expect(parse('paguei 1.500 MT de luz com o M-Pesa')).toMatchObject({
      valor: 1500, cat: 'energy_water', desc: 'Luz', account_id: 1,
    });
    expect(parse('chapa 30 meticais pelo m pesa')).toMatchObject({ valor: 30, cat: 'transport', account_id: 1, desc: 'Chapa' });
    expect(parse('comprei crédito de 100 meticais no emola')).toMatchObject({ valor: 100, cat: 'internet', account_id: 2 });
    expect(parse('almoço 350 em dinheiro')).toMatchObject({ valor: 350, cat: 'food', account_id: 3 });
    expect(parse('farmácia 820 meticais no BCI')).toMatchObject({ valor: 820, cat: 'health', account_id: 4, desc: 'Farmácia' });
  });

  it('understands numbers said in words', () => {
    expect(parse('gastei duzentos e cinquenta meticais no mercado').valor).toBe(250);
    expect(parse('paguei dois mil e quinhentos de renda').valor).toBe(2500);
    expect(parse('propinas mil meticais').valor).toBe(1000);
    expect(parse('5 mil de renda')).toMatchObject({ valor: 5000, cat: 'house_rent' });
  });

  it('does not take an article for the amount', () => {
    expect(parse('comprei um pão por 20')).toMatchObject({ valor: 20, desc: 'Pão' });
  });

  it('detects income', () => {
    expect(parse('recebi o salário de 25000 meticais no BCI')).toMatchObject({
      valor: 25000, tipo: 'receita', cat: 'salary', account_id: 4,
    });
    expect(parse('vendi galinhas 1200 meticais')).toMatchObject({ tipo: 'receita', valor: 1200 });
  });

  it('reads yesterday and handles decimals', () => {
    expect(parse('ontem gastei 45,50 em transporte')).toMatchObject({ valor: 45.5, data: '2026-11-01', cat: 'transport' });
    expect(parse('anteontem 300 de cerveja').data).toBe('2026-10-31');
  });

  it('returns no amount when none was said', () => {
    expect(parse('comprei pão')).toMatchObject({ valor: null, cat: 'food' });
  });

  it('works without accounts', () => {
    expect(parseVoiceTransaction('gastei 200 no mpesa em pão', { now }).account_id).toBeNull();
  });
});
