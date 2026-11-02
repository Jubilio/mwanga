/**
 * Turns a spoken sentence ("gastei 200 meticais em pão com o M-Pesa") into a
 * transaction draft: amount, type, category, account, date and description.
 * Everything runs locally; the user reviews the draft before it is saved.
 */
import { parseAmount } from './smsParser';

const strip = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase();

const compact = (value) => strip(value).replace(/[^a-z0-9]/g, '');

const UNITS = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezasseis: 16, dezesseis: 16,
  dezassete: 17, dezessete: 17, dezoito: 18, dezanove: 19, dezenove: 19,
  vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400, quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600,
  setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
};

const CURRENCY = new Set(['mt', 'mts', 'mzn', 'metical', 'meticais', 'meticas', 'meticai']);

const INCOME_WORDS = [
  'recebi', 'receber', 'recebido', 'ganhei', 'entrou', 'entraram', 'salario', 'ordenado', 'vendi',
  'depositaram', 'depositou', 'pagaram-me', 'me pagaram', 'transferiram-me', 'me transferiram',
  'mandaram-me', 'me mandaram', 'enviaram-me', 'me enviaram', 'receita', 'rendimento', 'lucro', 'comissao',
];

// Order matters: the first category with a matching word wins.
const CATEGORY_WORDS = [
  ['xitique', ['xitique', 'chitique', 'xitiki']],
  ['house_rent', ['renda', 'aluguer', 'aluguel', 'arrendamento', 'senhorio']],
  ['energy_water', ['luz', 'energia', 'credelec', 'edm', 'agua', 'fipag', 'gas', 'botija', 'carvao', 'lenha']],
  ['internet', ['internet', 'megas', 'dados moveis', 'pacote de dados', 'recarga', 'credito', 'saldo', 'wifi', 'vodacom', 'movitel', 'tmcel', 'tvcabo', 'starlink']],
  ['transport', ['chapa', 'taxi', 'txopela', 'uber', 'yango', 'bolt', 'combustivel', 'gasolina', 'gasoleo', 'diesel', 'bilhete', 'autocarro', 'machimbombo', 'transporte', 'boleia', 'portagem', 'estacionamento', 'mecanico', 'pneu', 'oficina']],
  ['health', ['farmacia', 'medicamento', 'medicamentos', 'remedio', 'remedios', 'hospital', 'clinica', 'consulta', 'medico', 'dentista', 'analises', 'saude']],
  ['education', ['escola', 'propina', 'propinas', 'matricula', 'livro', 'livros', 'caderno', 'cadernos', 'uniforme', 'universidade', 'faculdade', 'explicacao', 'curso', 'educacao', 'material escolar']],
  ['church_donations', ['igreja', 'dizimo', 'oferta', 'doacao', 'doei', 'contribuicao', 'mesquita', 'culto']],
  ['savings', ['poupanca', 'poupei', 'guardei', 'reserva']],
  ['investments', ['investimento', 'investi', 'acoes', 'obrigacoes', 'bilhetes do tesouro']],
  ['habitacao', ['obra', 'obras', 'cimento', 'blocos', 'tijolo', 'material de construcao', 'construcao', 'canalizador', 'pedreiro']],
  ['leisure', ['cerveja', 'cervejas', 'bebida', 'bebidas', 'festa', 'cinema', 'passeio', 'praia', 'futebol', 'netflix', 'dstv', 'jogo', 'discoteca', 'bar', 'lazer', 'roupa', 'roupas', 'sapatos', 'cabeleireiro', 'barbeiro', 'presente', 'aniversario']],
  ['food', ['pao', 'comida', 'mercado', 'supermercado', 'shoprite', 'mercearia', 'almoco', 'jantar', 'pequeno almoco', 'refeicao', 'lanche', 'restaurante', 'arroz', 'frango', 'carne', 'peixe', 'leite', 'oleo', 'acucar', 'farinha', 'verdura', 'verduras', 'fruta', 'frutas', 'tomate', 'cebola', 'batata', 'ovos', 'feijao', 'xima', 'cafe', 'cha', 'bolachas', 'agua mineral', 'alimentacao', 'compras']],
];

const INCOME_CATEGORY_WORDS = [
  ['salary', ['salario', 'ordenado', 'vencimento']],
  ['xitique', ['xitique', 'chitique']],
  ['investments', ['juros', 'dividendos', 'lucro', 'investimento']],
];

// Spoken names for common wallets, matched against the user's own account names.
const ACCOUNT_ALIASES = [
  { match: ['mpesa', 'empesa', 'emepesa'], account: ['mpesa'] },
  { match: ['emola'], account: ['emola'] },
  { match: ['mkesh', 'emkesh', 'emecache', 'mcash'], account: ['mkesh'] },
  { match: ['dinheiro vivo', 'em dinheiro', 'cash', 'carteira', 'numerario'], account: ['dinheiro', 'cash', 'carteira', 'numerario', 'caixa'] },
  { match: ['cartao', 'banco'], account: ['banco', 'cartao', 'bci', 'bim', 'millennium', 'standard', 'absa', 'moza', 'fnb', 'letshego', 'access'] },
];

const FILLER = new Set([
  'eu', 'gastei', 'gasto', 'gastar', 'paguei', 'pago', 'pagar', 'comprei', 'compra', 'comprar', 'despesa',
  'recebi', 'receber', 'recebido', 'ganhei', 'entrou', 'entraram', 'vendi', 'depositaram', 'depositou',
  'hoje', 'ontem', 'anteontem', 'agora', 'foi', 'foram', 'custou', 'custaram', 'total', 'valor', 'de', 'registar', 'regista', 'adiciona', 'adicionar',
]);

const EDGE_WORDS = new Set([
  'em', 'no', 'na', 'nos', 'nas', 'com', 'de', 'do', 'da', 'dos', 'das', 'para', 'pra', 'pro', 'o', 'a', 'os', 'as',
  'um', 'uma', 'pelo', 'pela', 'via', 'por', 'e', 'que', 'me', 'meu', 'minha', 'ao', 'à',
]);

function localDate(offsetDays = 0, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hasWord(normText, word) {
  return new RegExp(`(^|[^a-z0-9])${word.replace(/[-]/g, '[- ]?')}([^a-z0-9]|$)`).test(normText);
}

/** Reads "duzentos e cinquenta", "dois mil e quinhentos" or "mil" from tokens[start]. */
function readNumberWords(tokens, start) {
  let total = 0;
  let group = 0;
  let used = 0;
  let seen = false;
  for (let i = start; i < tokens.length; i += 1) {
    const word = tokens[i].norm;
    if (word in UNITS) {
      group += UNITS[word];
      seen = true;
      used = i - start + 1;
    } else if (word === 'mil') {
      total += (group || 1) * 1000;
      group = 0;
      seen = true;
      used = i - start + 1;
    } else if (word === 'e' && seen && i + 1 < tokens.length && (tokens[i + 1].norm in UNITS || tokens[i + 1].norm === 'mil')) {
      continue;
    } else {
      break;
    }
  }
  return seen ? { value: total + group, used } : null;
}

function tokenize(text) {
  return String(text || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ raw, norm: strip(raw).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '') }));
}

function findAmounts(tokens) {
  const found = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const { norm, raw } = tokens[i];
    let value = null;
    let used = 0;
    if (/^\d/.test(norm) || /^\d/.test(raw)) {
      const digits = raw.replace(/[^\d.,]/g, '');
      if (!digits) continue;
      // "1.500" / "1,500" spoken amounts are thousands, not decimals.
      value = /^\d{1,3}([.,]\d{3})+$/.test(digits) ? Number(digits.replace(/[.,]/g, '')) : parseAmount(digits);
      used = 1;
      // "1 500" spoken as two groups.
      while (i + used < tokens.length && /^\d{3}$/.test(tokens[i + used].norm) && value < 1000) {
        value = value * 1000 + Number(tokens[i + used].norm);
        used += 1;
      }
      // Stuck currency, e.g. "200mt".
      if (/[a-z]/.test(norm) && !CURRENCY.has(norm.replace(/^[\d.,]+/, ''))) continue;
      if (tokens[i + used]?.norm === 'mil') {
        value *= 1000;
        used += 1;
      }
    } else if (norm === 'mt' || norm === 'mzn') {
      continue;
    } else {
      const words = readNumberWords(tokens, i);
      if (!words) continue;
      // "um pão", "uma coca": an article, not an amount, unless money follows.
      if (words.value === 1 && words.used === 1 && !CURRENCY.has(tokens[i + 1]?.norm || '')) continue;
      ({ value, used } = words);
    }
    if (!Number.isFinite(value) || value <= 0) continue;
    const next = tokens[i + used]?.norm || '';
    const stuckCurrency = CURRENCY.has(norm.replace(/^[\d.,]+/, ''));
    const prev = tokens[i - 1]?.norm || '';
    found.push({
      start: i,
      used: used + (CURRENCY.has(next) ? 1 : 0),
      value,
      currency: stuckCurrency || CURRENCY.has(next) || CURRENCY.has(prev),
      isDay: prev === 'dia',
    });
    i += used - 1;
  }
  return found;
}

function findAccount(normText, accounts) {
  const list = (accounts || []).filter((a) => a && a.id != null && a.name);
  const flat = compact(normText);
  // 1. The account's own name said out loud ("BCI", "Conta Millennium").
  const named = list
    .map((account) => ({ account, key: compact(account.name) }))
    .filter(({ key }) => key.length >= 3 && flat.includes(key))
    .sort((a, b) => b.key.length - a.key.length)[0];
  if (named) return { account: named.account, spoken: [named.key] };
  // 2. A spoken wallet name ("M-Pesa", "cash") mapped to the user's account of that kind.
  for (const alias of ACCOUNT_ALIASES) {
    const said = alias.match.map(compact).find((m) => flat.includes(m));
    if (!said) continue;
    const account = list.find((a) => alias.account.some((key) => compact(a.name).includes(key)));
    if (account) return { account, spoken: [said, compact(account.name)] };
  }
  return null;
}

/** Indexes of the consecutive tokens that spell one of `targets` ("m", "pesa" → "mpesa"). */
function spokenRun(tokens, targets) {
  const hits = new Set();
  for (let i = 0; i < tokens.length; i += 1) {
    let joined = '';
    for (let j = i; j < Math.min(tokens.length, i + 4); j += 1) {
      joined += compact(tokens[j].raw);
      if (targets.includes(joined)) {
        for (let k = i; k <= j; k += 1) hits.add(k);
        break;
      }
      if (!targets.some((t) => t.startsWith(joined))) break;
    }
  }
  return hits;
}

function pickCategory(normText, type) {
  const table = type === 'receita' ? INCOME_CATEGORY_WORDS : CATEGORY_WORDS;
  for (const [category, words] of table) {
    if (words.some((w) => (w.includes(' ') ? normText.includes(w) : hasWord(normText, w)))) return category;
  }
  return type === 'receita' ? 'salary' : 'other';
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/**
 * @param {string} transcript what the speech recogniser heard
 * @param {{ accounts?: Array<{id:any,name:string}>, now?: Date }} [options]
 * @returns {{ valor: number|null, tipo: 'despesa'|'receita', cat: string, desc: string, data: string, account_id: any }}
 */
export function parseVoiceTransaction(transcript, { accounts = [], now = new Date() } = {}) {
  const text = String(transcript || '').trim();
  const normText = strip(text);
  const tokens = tokenize(text);

  const amounts = findAmounts(tokens).filter((a) => !a.isDay);
  const amount = amounts.find((a) => a.currency)
    || amounts.reduce((best, a) => (!best || a.value > best.value ? a : best), null);

  const tipo = INCOME_WORDS.some((w) => (w.includes(' ') ? normText.includes(w) : hasWord(normText, w))) ? 'receita' : 'despesa';
  const cat = pickCategory(normText, tipo);

  let data = localDate(0, now);
  if (hasWord(normText, 'anteontem')) data = localDate(-2, now);
  else if (hasWord(normText, 'ontem')) data = localDate(-1, now);

  const accountHit = findAccount(normText, accounts);

  // Description: what is left once amount, verbs, dates and the account are removed.
  const drop = new Set();
  amounts.forEach((a) => { for (let i = a.start; i < a.start + a.used; i += 1) drop.add(i); });
  tokens.forEach((t, i) => {
    if (FILLER.has(t.norm) || CURRENCY.has(t.norm)) drop.add(i);
  });
  if (accountHit) spokenRun(tokens, accountHit.spoken).forEach((i) => drop.add(i));
  const kept = tokens.filter((_, i) => !drop.has(i)).map((t) => t.raw.replace(/[.,!?;:]+$/, ''));
  while (kept.length && EDGE_WORDS.has(strip(kept[0]))) kept.shift();
  while (kept.length && EDGE_WORDS.has(strip(kept[kept.length - 1]))) kept.pop();
  let desc = capitalize(kept.join(' ').trim());
  if (!desc || desc.length < 2) desc = tipo === 'receita' ? 'Receita' : 'Despesa';

  return {
    valor: amount ? Math.round(amount.value * 100) / 100 : null,
    tipo,
    cat,
    desc,
    data,
    account_id: accountHit ? accountHit.account.id : null,
  };
}
