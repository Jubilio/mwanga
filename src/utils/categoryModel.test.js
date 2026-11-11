import { describe, it, expect } from 'vitest';
import {
  trainCategoryModel, learn, suggestCategory, ruleCategory, tokenize, merchantKey, SUGGEST_THRESHOLD,
} from './categoryModel';
import { buildSyntheticHouseholds } from '../../server/evals/categorias/synthetic.mjs';

const tx = (desc, cat, tipo = 'despesa') => ({ desc, cat, tipo });

describe('categoryModel', () => {
  it('drops numbers, accents and the bank wording from SMS descriptions', () => {
    expect(merchantKey('M-Pesa - Transferência enviada - DONA AMÉLIA 2')).toBe('dona amelia');
    expect(tokenize('Pão 50')).toContain('pao');
  });

  it('uses shared rules for a household with no history', () => {
    expect(ruleCategory('Chapa para o serviço', 'despesa')).toBe('transport');
    expect(ruleCategory('Credelec 500', 'despesa')).toBe('energy_water');
    const s = suggestCategory(trainCategoryModel([]), { description: 'Shoprite Matola', type: 'despesa' });
    expect(s).toMatchObject({ category: 'food', source: 'rules' });
  });

  it('never suggests an income category for an expense, or the reverse', () => {
    expect(ruleCategory('salário', 'despesa')).toBeNull();
    expect(ruleCategory('salário de Maio', 'receita')).toBe('salary');
    expect(ruleCategory('chapa', 'receita')).toBeNull();
  });

  it('learns a personal name no rule knows from one past choice', () => {
    const model = trainCategoryModel([tx('Tio Zeca', 'education')]);
    const s = suggestCategory(model, { description: 'tio zeca', type: 'despesa' });
    expect(s).toMatchObject({ category: 'education', source: 'memory' });
    expect(s.confidence).toBeGreaterThanOrEqual(SUGGEST_THRESHOLD);
  });

  it('a correction changes the next suggestion', () => {
    const model = trainCategoryModel([tx('Vodacom', 'internet')]);
    expect(suggestCategory(model, { description: 'Vodacom', type: 'despesa' }).category).toBe('internet');
    learn(model, tx('Vodacom', 'other'));
    learn(model, tx('Vodacom', 'other'));
    expect(suggestCategory(model, { description: 'Vodacom', type: 'despesa' }).category).toBe('other');
  });

  it('generalises from words, not only exact descriptions', () => {
    const model = trainCategoryModel([
      tx('Barraca do Jaime frango', 'food'), tx('Barraca do Jaime arroz', 'food'), tx('Barraca do Jaime', 'food'),
      tx('Nelson motorista', 'transport'), tx('Nelson motorista semana', 'transport'),
    ]);
    const s = suggestCategory(model, { description: 'Barraca Jaime óleo', type: 'despesa' });
    expect(s.category).toBe('food');
    expect(s.source).toBe('model');
  });

  it('says nothing when it has nothing to go on', () => {
    expect(suggestCategory(trainCategoryModel([]), { description: 'xyz', type: 'despesa' }).category).toBeNull();
    expect(suggestCategory(trainCategoryModel([]), { description: '', type: 'despesa' }).source).toBe('none');
  });

  it('accepts the API shape too', () => {
    const model = trainCategoryModel([{ description: 'Mamã Rosa', category: 'food', type: 'despesa' }]);
    expect(suggestCategory(model, { description: 'Mamã Rosa', type: 'despesa' }).category).toBe('food');
  });

  // Quality gate on the synthetic households used by server/evals/categorias.
  it('beats the shared rules and the old form default when replayed in date order', () => {
    const households = buildSyntheticHouseholds({ households: 25, seed: 11 });
    let modelHits = 0; let ruleHits = 0; let defaultHits = 0; let n = 0;
    for (const h of households) {
      const model = trainCategoryModel([]);
      for (const t of h.transactions) {
        const fallback = t.type === 'receita' ? 'salary' : 'food';
        const s = suggestCategory(model, { description: t.description, type: t.type });
        const shown = s.category && s.confidence >= SUGGEST_THRESHOLD ? s.category : fallback;
        const rule = ruleCategory(t.description, t.type) || fallback;
        modelHits += shown === t.category; ruleHits += rule === t.category; defaultHits += fallback === t.category; n += 1;
        learn(model, t);
      }
    }
    expect(modelHits / n).toBeGreaterThan(0.8);
    expect(modelHits / n - ruleHits / n).toBeGreaterThan(0.1);
    expect(ruleHits / n).toBeGreaterThan(defaultHits / n);
  });
});
