const english = {
  "Taxa de poupança": "Savings rate",
  "Poupança e Proteção": "Savings and protection",
  "Controlo de orçamento": "Budget control",
  "Planeamento e Sabedoria": "Planning and wisdom",
  "Progresso nas metas": "Goal progress",
  "Fidelidade no Pouco": "Faithfulness in small things",
  "Rácio dívida/rendimento": "Debt-to-income ratio",
  "Evitar Dívidas Excessivas": "Avoiding excessive debt",
  "Poupança comunitária": "Community savings",
  "Generosidade": "Generosity",
  "Tudo dentro do orçamento": "Everything within budget",
  "Xitique activo ✦": "Active Xitique ✦",
  "Sem grupo activo": "No active group",
  "Perfeito": "Perfect",
  "Excelente": "Excellent",
  "Bom": "Good",
  "A melhorar": "Needs improvement",
  "Crítico": "Critical",
  "Fiel Mordomo 🏆": "Faithful steward 🏆",
  "Sábio Gestor 🌟": "Wise manager 🌟",
  "Em Progresso 📈": "Making progress 📈",
  "Precisa Atenção ⚠️": "Needs attention ⚠️",
  "Momento de Reflexão 🙏": "Time for reflection 🙏",
  "Erro ao calcular o score": "Could not calculate the score"
};
function localizeScore(result, language) {
  if (language !== 'en') return result;
  const translate = value => english[value] || value;
  return { ...result, label: translate(result.label), biblical_label: translate(result.biblical_label), factors: result.factors.map(factor => ({
    ...factor, name: translate(factor.name), biblical_principle: translate(factor.biblical_principle),
    value: translate(factor.value).replace(/ categorias excedidas$/, ' categories over budget').replace(/% em média$/, '% on average').replace(/x rendimento anual$/, 'x annual income'),
  })) };
}
module.exports = { localizeScore };
