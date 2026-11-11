// Synthetic households for evaluating category suggestions without real data.
// Built to be hard on purpose: each household has personal names and shops that
// no shared rule knows, the same merchant can mean different things in different
// homes, descriptions carry typos and SMS wording, and 4 % of labels are wrong.
// It shows whether the mechanism learns; real accuracy comes from `--db`.

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (r, list) => list[Math.floor(r() * list.length)];

// Common spending words and merchants in Maputo/Matola, by category.
const SHARED = {
  food: ['Shoprite', 'Spar', 'Mercado Janet', 'Mercado do Povo', 'Pão', 'Padaria', 'Almoço', 'Mercearia', 'Frango', 'Peixe', 'Arroz e óleo', 'Verduras', 'Pick n Pay', 'Recheio', 'Lanche', 'Cantina'],
  transport: ['Chapa', 'Txopela', 'Yango', 'Gasolina', 'Combustível Galp', 'Petromoc', 'My Love', 'Bolt', 'Portagem'],
  energy_water: ['Credelec', 'EDM', 'Água FIPAG', 'Luz', 'Recarga de energia', 'Gás de cozinha'],
  internet: ['Recarga Vodacom', 'Megas', 'Movitel', 'TVCabo', 'DStv', 'Dados móveis', 'Recarga Tmcel'],
  health: ['Farmácia', 'Consulta', 'Clínica', 'Medicamentos', 'Análises', 'Hospital Central'],
  education: ['Propina', 'Material escolar', 'Livros', 'Explicação', 'Uniforme', 'Matrícula'],
  house_rent: ['Renda', 'Renda casa', 'Aluguer'],
  church_donations: ['Dízimo', 'Oferta igreja', 'Igreja', 'Doação'],
  leisure: ['Cerveja', '2M', 'Restaurante', 'Cinema', 'Netflix', 'Festa', 'Praia', 'Pizza', 'KFC'],
  savings: ['Poupança', 'Reserva'],
  xitique: ['Xitique', 'Xitique do grupo'],
  habitacao: ['Cimento', 'Blocos', 'Pedreiro', 'Tinta'],
  other: ['Cabeleireiro', 'Roupa', 'Presente', 'Sapatos', 'Taxa bancária', 'Lavandaria'],
};

// Ambiguous merchants: households disagree on the category.
const AMBIGUOUS = [
  ['Galp loja', ['food', 'transport']],
  ['Vodacom', ['internet', 'other']],
  ['Game', ['other', 'food', 'leisure']],
  ['Recarga', ['internet', 'energy_water']],
  ['Mercado', ['food', 'other']],
];

const NAMES = ['Dona Amélia', 'Tio Zeca', 'Mana Lúcia', 'Sr Abdul', 'Loja do Ussene', 'Banca da esquina', 'Mamã Rosa', 'Tia Celeste', 'Mano Chico', 'Nelson motorista', 'Professor Matsinhe', 'Dra Nhantumbo', 'Barraca do Jaime', 'Senhora Fátima', 'Ilídio', 'Armando'];
const PERSONAL_CATS = ['food', 'transport', 'education', 'other', 'church_donations', 'health', 'house_rent', 'leisure'];

const INCOME = {
  salary: ['Salário', 'Ordenado', 'Vencimento', 'Salário empresa'],
  other: ['Biscato', 'Venda', 'Reembolso', 'Presente recebido'],
};

const CHANNELS = ['M-Pesa', 'e-Mola', 'BCI', 'BIM', 'Millennium bim'];

function noisy(r, text) {
  let s = text;
  if (r() < 0.3) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (r() < 0.3) s = s.toLowerCase();
  if (r() < 0.05 && s.length > 5) {
    const i = 1 + Math.floor(r() * (s.length - 2));
    s = s.slice(0, i) + s.slice(i + 1);
  }
  return s;
}

function describe(r, base) {
  const roll = r();
  if (roll < 0.15) return `${pick(r, CHANNELS)} - ${pick(r, ['Compra', 'Transferência enviada', 'Pagamento'])} - ${base.toUpperCase()}`;
  if (roll < 0.25) return `${base} ${pick(r, ['Matola', 'Baixa', 'Zimpeto', 'Sommerschield', 'hoje', 'semana', '2'])}`;
  if (roll < 0.32) return `pago ${base}`;
  return base;
}

export function buildSyntheticHouseholds({ households = 60, seed = 7 } = {}) {
  const r = rng(seed);
  const out = [];
  const categories = Object.keys(SHARED);
  for (let h = 0; h < households; h += 1) {
    // Each household spends differently.
    const weights = Object.fromEntries(categories.map((c) => [c, r() ** 2 + (c === 'food' || c === 'transport' ? 1 : 0)]));
    const ambiguous = AMBIGUOUS.map(([m, cats]) => [m, pick(r, cats)]);
    const personal = Array.from({ length: 3 + Math.floor(r() * 5) }, () => [pick(r, NAMES), pick(r, PERSONAL_CATS)]);
    const n = 40 + Math.floor(r() * 360);
    const txs = [];
    const start = Date.UTC(2026, 4, 1);
    for (let i = 0; i < n; i += 1) {
      const date = new Date(start + Math.floor((i / n) * 180) * 86400000).toISOString().slice(0, 10);
      let type = 'despesa';
      let cat;
      let base;
      const roll = r();
      if (roll < 0.08) {
        type = 'receita';
        cat = r() < 0.6 ? 'salary' : 'other';
        base = pick(r, INCOME[cat]);
        if (cat === 'other' && r() < 0.5) base = `M-Pesa - Transferência recebida - ${pick(r, NAMES).toUpperCase()}`;
      } else if (roll < 0.30) {
        [base, cat] = pick(r, personal);
        if (r() < 0.5) base = `M-Pesa - Transferência enviada - ${base.toUpperCase()}`;
      } else if (roll < 0.40) {
        [base, cat] = pick(r, ambiguous);
      } else {
        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let x = r() * total;
        cat = categories.find((c) => (x -= weights[c]) <= 0) || 'food';
        base = pick(r, SHARED[cat]);
      }
      const label = r() < 0.04 ? pick(r, categories) : cat;
      txs.push({ id: i + 1, date, type, description: noisy(r, describe(r, base)), category: label });
    }
    out.push({ householdId: `syn-${h + 1}`, transactions: txs });
  }
  return out;
}
