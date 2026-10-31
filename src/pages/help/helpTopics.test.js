import { describe, expect, it } from 'vitest';
import pt from '../../locales/pt/translation.json';
import en from '../../locales/en/translation.json';
import { HELP_CATEGORIES, HELP_FAQS, matchesQuery, normalizeSearch } from './helpTopics';

describe('help search', () => {
  it('ignores accents and case', () => {
    expect(normalizeSearch('Orçamento PÁGINA')).toBe('orcamento pagina');
    expect(matchesQuery('Como funciona o Orçamento?', 'orcamento')).toBe(true);
  });

  it('needs every word of the query', () => {
    expect(matchesQuery('Importar SMS do M-Pesa', 'sms pesa')).toBe(true);
    expect(matchesQuery('Importar SMS do M-Pesa', 'sms xitique')).toBe(false);
    expect(matchesQuery('anything', '   ')).toBe(true);
  });
});

describe('help content', () => {
  const categoryIds = HELP_CATEGORIES.map((c) => c.id);

  it.each([['pt', pt], ['en', en]])('has a question, an answer and a category label for every topic in %s', (_, locale) => {
    for (const faq of HELP_FAQS) {
      expect(categoryIds).toContain(faq.cat);
      expect(locale.help.faq[faq.id]?.q, faq.id).toBeTruthy();
      expect(locale.help.faq[faq.id]?.a, faq.id).toBeTruthy();
      if (faq.to) expect(faq.page, faq.id).toBeTruthy();
    }
    for (const id of categoryIds) expect(locale.help.categories[id], id).toBeTruthy();
  });
});
