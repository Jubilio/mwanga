const { localizeScore } = require('../scoreLanguage');

test('score response localizes every system field and preserves numeric results', () => {
  const source = { score: 60, label: 'Bom', biblical_label: 'Em Progresso 📈', factors: [
    { name: 'Controlo de orçamento', biblical_principle: 'Planeamento e Sabedoria', value: '2 categorias excedidas', pts: 9, max: 25 },
    { name: 'Progresso nas metas', biblical_principle: 'Fidelidade no Pouco', value: '50% em média', pts: 10, max: 20 },
    { name: 'Rácio dívida/rendimento', biblical_principle: 'Evitar Dívidas Excessivas', value: '1.2x rendimento anual', pts: 12, max: 20 },
  ] };
  const english = localizeScore(source, 'en');
  expect(english.label).toBe('Good');
  expect(english.biblical_label).toBe('Making progress 📈');
  expect(english.factors[0]).toEqual({ name: 'Budget control', biblical_principle: 'Planning and wisdom', value: '2 categories over budget', pts: 9, max: 25 });
  expect(english.factors[1].value).toBe('50% on average');
  expect(english.factors[2].value).toBe('1.2x annual income');
  expect(english.score).toBe(source.score);
  expect(source.label).toBe('Bom');
  expect(localizeScore(source, 'pt')).toBe(source);
});
