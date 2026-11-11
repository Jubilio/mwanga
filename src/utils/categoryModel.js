/**
 * Category suggestions that learn from each household's own history.
 *
 * Three layers, tried in order:
 *   1. memory  - the same description (e.g. "Shoprite Matola") was categorised
 *                before: reuse what the person chose most often.
 *   2. model   - multinomial Naive Bayes over description words, trained on the
 *                household's own transactions (corrections included, since an
 *                edited transaction is saved with the category the person chose).
 *   3. rules   - shared keywords for Mozambique (chapa, Credelec, Shoprite...),
 *                used for new households and words the model has never seen.
 *
 * Everything runs on the device from the transactions already in memory, so it
 * works offline, costs nothing and never sends descriptions anywhere.
 * See docs/ML_CATEGORIAS.md for the evaluation and the thresholds.
 */

export const MODEL_VERSION = 'cat-nb-1';

// Below this confidence the form keeps its current category instead of guessing.
export const SUGGEST_THRESHOLD = 0.55;

const INCOME_TYPES = new Set(['receita']);

// Categories that only make sense for one direction of money.
const INCOME_ONLY = new Set(['salary']);

// Shared knowledge for a household with no history yet. Order matters: first hit wins.
export const CATEGORY_RULES = [
  [/\b(salario|ordenado|vencimento|subsidio)\b/, 'salary'],
  [/\bxitique|xitiki|chitique\b/, 'xitique'],
  [/\b(chapa|txopela|tchopela|my ?love|machimbombo|autocarro|uber|yango|bolt|taxi|combustivel|gasolina|gasoleo|petromoc|galp|puma|totalenergies|portagem|transporte|boleia|metrobus)\b/, 'transport'],
  [/\b(credelec|edm|energia|eletricidade|electricidade|luz|fipag|aguas? da regiao|agua|adrmm|gas de cozinha)\b/, 'energy_water'],
  [/\b(recarga|megas|internet|dados|vodacom|movitel|tmcel|mcel|tvcabo|tv cabo|dstv|zap|starlink|fibra|giga)\b/, 'internet'],
  [/\b(farmacia|hospital|medico|clinica|remedio|medicamento|consulta|analises|dentista|laboratorio|centro med|saude)\b/, 'health'],
  [/\b(escola|propina|propinas|livro|livros|curso|universidade|uem|ucm|isctem|explicacao|explicador|material escolar|uniforme|matricula)\b/, 'education'],
  [/\b(renda|aluguer|arrendamento|senhorio)\b/, 'house_rent'],
  [/\b(obra|cimento|blocos|pedreiro|canalizador|ferragem|tinta|chapas de zinco|reparacao da casa|construcao)\b/, 'habitacao'],
  [/\b(igreja|dizimo|oferta|doacao|doacoes|missa|culto|mesquita|zakat)\b/, 'church_donations'],
  [/\b(poupanca|poupar|reserva|cofre)\b/, 'savings'],
  [/\b(investimento|accoes|acoes|bolsa|bvm|obrigacoes|deposito a prazo)\b/, 'investments'],
  [/\b(restaurante|bar|cerveja|2m|laurentina|cinema|festa|netflix|showmax|spotify|jogo|futebol|praia|passeio|takeaway|pizza|kfc|nandos|hamburguer|discoteca)\b/, 'leisure'],
  [/\b(pao|padaria|mercado|comida|almoco|jantar|pequeno almoco|supermercado|shoprite|spar|pick n pay|recheio|mercearia|refeicao|lanche|arroz|farinha|oleo|frango|peixe|carne|verdura|fruta|leite|acucar|matapa|xima|cantina|talho)\b/, 'food'],
];

const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'as', 'os', 'e', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'pra', 'por', 'com', 'um', 'uma', 'ao', 'mt', 'mzn', 'meticais', 'sms', 'ref', 'id',
]);

// Words that come from how the app builds SMS descriptions ("M-Pesa - Compra - X").
// They describe the channel, not what the money was for.
const CHANNEL_WORDS = new Set([
  'mpesa', 'm', 'pesa', 'emola', 'mkesh', 'bim', 'bci', 'millennium', 'standard', 'absa', 'moza', 'fnb',
  'debito', 'credito', 'compra', 'pagamento', 'movimento', 'transferencia', 'enviada', 'recebida',
  'levantamento', 'deposito', 'taxa', 'agente', 'trans', 'conf', 'confirmado',
]);

export function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/m-pesa/g, 'mpesa')
    .replace(/e-mola/g, 'emola')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text) {
  const words = normalizeText(text)
    .split(' ')
    .filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !STOPWORDS.has(w));
  const content = words.filter((w) => !CHANNEL_WORDS.has(w));
  const base = content.length ? content : words;
  const tokens = [...base];
  for (let i = 0; i < base.length - 1; i += 1) tokens.push(`${base[i]}_${base[i + 1]}`);
  return tokens;
}

// The words that identify a merchant or person, without numbers and channel words.
export function merchantKey(text) {
  return tokenize(text).filter((t) => !t.includes('_')).join(' ');
}

export function ruleCategory(text, type) {
  const norm = normalizeText(text);
  if (!norm) return null;
  for (const [re, cat] of CATEGORY_RULES) {
    if (!re.test(norm)) continue;
    if (!allowedFor(cat, type)) continue;
    return cat;
  }
  return null;
}

function allowedFor(category, type) {
  if (!type) return true;
  const income = INCOME_TYPES.has(type);
  if (income) return category === 'salary' || category === 'other' || category === 'investments' || category === 'xitique' || category === 'savings';
  return !INCOME_ONLY.has(category);
}

function directionOf(type) {
  return INCOME_TYPES.has(type) ? 'in' : 'out';
}

/**
 * Train on a household's transactions. Accepts the app's shape ({ desc, cat, tipo })
 * or the API's ({ description, category, type }).
 */
export function trainCategoryModel(transactions = [], { alpha = 0.5 } = {}) {
  const model = {
    version: MODEL_VERSION,
    alpha,
    size: 0,
    byDirection: { in: newSide(), out: newSide() },
    memory: new Map(),
  };
  for (const tx of transactions) learn(model, tx);
  return model;
}

function newSide() {
  return { docs: 0, classDocs: new Map(), classTokens: new Map(), tokenCounts: new Map(), vocab: new Set() };
}

/** Add one confirmed transaction to a trained model (online update). */
export function learn(model, tx) {
  const desc = tx.desc ?? tx.description;
  const cat = tx.cat ?? tx.category;
  const type = tx.tipo ?? tx.type;
  if (!desc || !cat) return model;
  const tokens = tokenize(desc);
  if (!tokens.length) return model;

  const side = model.byDirection[directionOf(type)];
  side.docs += 1;
  side.classDocs.set(cat, (side.classDocs.get(cat) || 0) + 1);
  side.classTokens.set(cat, (side.classTokens.get(cat) || 0) + tokens.length);
  let counts = side.tokenCounts.get(cat);
  if (!counts) { counts = new Map(); side.tokenCounts.set(cat, counts); }
  for (const t of tokens) {
    counts.set(t, (counts.get(t) || 0) + 1);
    side.vocab.add(t);
  }

  const key = `${directionOf(type)}|${merchantKey(desc)}`;
  if (key.length > 4) {
    let m = model.memory.get(key);
    if (!m) { m = new Map(); model.memory.set(key, m); }
    m.set(cat, (m.get(cat) || 0) + 1);
  }
  model.size += 1;
  return model;
}

function fromMemory(model, desc, type) {
  const m = model.memory.get(`${directionOf(type)}|${merchantKey(desc)}`);
  if (!m) return null;
  let best = null; let bestN = 0; let total = 0;
  for (const [cat, n] of m) { total += n; if (n > bestN) { best = cat; bestN = n; } }
  // Laplace-style: one past choice gives 0.67, three consistent ones 0.8.
  return { category: best, confidence: (bestN + 1) / (total + 2) };
}

function fromNaiveBayes(model, tokens, type) {
  const side = model.byDirection[directionOf(type)];
  if (side.docs < 3 || side.classDocs.size < 1) return null;
  const known = tokens.filter((t) => side.vocab.has(t));
  // No word seen before: the model would only echo the most common category.
  if (!known.length) return null;

  const V = side.vocab.size;
  const { alpha } = model;
  const scores = [];
  for (const [cat, docs] of side.classDocs) {
    if (!allowedFor(cat, type)) continue;
    const counts = side.tokenCounts.get(cat);
    const denom = side.classTokens.get(cat) + alpha * V;
    let s = Math.log(docs / side.docs);
    for (const t of known) s += Math.log(((counts.get(t) || 0) + alpha) / denom);
    scores.push([cat, s]);
  }
  if (!scores.length) return null;
  const max = Math.max(...scores.map(([, s]) => s));
  const exp = scores.map(([c, s]) => [c, Math.exp(s - max)]);
  const z = exp.reduce((a, [, e]) => a + e, 0);
  exp.sort((a, b) => b[1] - a[1]);
  // Shrink towards uncertainty when only part of the description is known.
  const coverage = known.length / tokens.length;
  const p = exp[0][1] / z;
  return { category: exp[0][0], confidence: p * (0.5 + 0.5 * coverage) };
}

/**
 * Suggest a category. Returns { category, confidence, source } where source is
 * 'memory' | 'model' | 'rules' | 'none'. category is null when there is nothing
 * better than a guess; callers should only auto-fill at confidence >= SUGGEST_THRESHOLD.
 */
export function suggestCategory(model, { description, type } = {}) {
  const tokens = tokenize(description);
  if (!tokens.length) return { category: null, confidence: 0, source: 'none' };

  const mem = model ? fromMemory(model, description, type) : null;
  if (mem && mem.confidence >= SUGGEST_THRESHOLD) return { ...mem, source: 'memory' };

  const nb = model ? fromNaiveBayes(model, tokens, type) : null;
  const rule = ruleCategory(description, type);

  if (nb && nb.confidence >= SUGGEST_THRESHOLD) return { ...nb, source: 'model' };
  if (rule) {
    // The household's own words agree with the shared rule: more confident.
    const agree = nb && nb.category === rule;
    return { category: rule, confidence: agree ? Math.max(0.75, nb.confidence) : 0.6, source: 'rules' };
  }
  if (mem) return { ...mem, source: 'memory' };
  if (nb) return { ...nb, source: 'model' };
  return { category: null, confidence: 0, source: 'none' };
}
