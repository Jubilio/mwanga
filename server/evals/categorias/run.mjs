#!/usr/bin/env node
// Evaluates category suggestions the way they are used: for each household, in
// date order, predict every transaction from the ones before it only, then learn
// it (prequential evaluation; nothing from the future leaks in).
//
//   node evals/categorias/run.mjs              # synthetic households (default)
//   DATABASE_URL=... node evals/categorias/run.mjs --db   # real data, aggregates only
//   node evals/categorias/run.mjs --json       # machine-readable output
//
// Prints no descriptions, ids or household identifiers in --db mode.

import {
  trainCategoryModel, learn, suggestCategory, ruleCategory, SUGGEST_THRESHOLD, MODEL_VERSION,
} from '../../../src/utils/categoryModel.js';
import { buildSyntheticHouseholds } from './synthetic.mjs';

const args = new Set(process.argv.slice(2));

// What the manual form pre-selects today, before this change.
const formDefault = (type) => (type === 'receita' ? 'salary' : 'food');

const STRATEGIES = {
  // Current app: the form opens on "food" (expense) or "salary" (income).
  default: () => (tx) => ({ category: formDefault(tx.type), confidence: 1 }),
  // Shared keywords only, same for everyone.
  rules: () => (tx) => {
    const c = ruleCategory(tx.description, tx.type);
    return c ? { category: c, confidence: 0.6 } : { category: null, confidence: 0 };
  },
  // Full model: memory + Naive Bayes on the household's history + rules.
  model: (model) => (tx) => suggestCategory(model, { description: tx.description, type: tx.type }),
};

function evaluateHousehold(transactions, strategyName) {
  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
  const model = trainCategoryModel([]);
  const rows = [];
  sorted.forEach((tx, i) => {
    const s = STRATEGIES[strategyName](model)(tx);
    const suggested = s.category && s.confidence >= SUGGEST_THRESHOLD;
    // What the form ends up showing: the suggestion, or the old default.
    const shown = suggested ? s.category : formDefault(tx.type);
    rows.push({ truth: tx.category, shown, suggested, hit: suggested && s.category === tx.category, source: s.source, n: i, confidence: s.confidence });
    learn(model, tx);
  });
  return rows;
}

function macroF1(rows) {
  const cats = new Set(rows.map((r) => r.truth));
  let sum = 0;
  for (const c of cats) {
    const tp = rows.filter((r) => r.shown === c && r.truth === c).length;
    const fp = rows.filter((r) => r.shown === c && r.truth !== c).length;
    const fn = rows.filter((r) => r.shown !== c && r.truth === c).length;
    const f1 = tp ? (2 * tp) / (2 * tp + fp + fn) : 0;
    sum += f1;
  }
  return cats.size ? sum / cats.size : 0;
}

function summarise(perHousehold) {
  const all = perHousehold.flat();
  const correct = all.filter((r) => r.shown === r.truth).length;
  const suggested = all.filter((r) => r.suggested);
  return {
    n: all.length,
    accuracy: correct / all.length,
    macroF1: macroF1(all),
    coverage: suggested.length / all.length,
    precisionWhenSuggested: suggested.length ? suggested.filter((r) => r.hit).length / suggested.length : null,
  };
}

// 95 % interval by resampling households (transactions in a home are not independent).
function bootstrap(perHousehold, metric, reps = 500, seed = 1) {
  let s = seed;
  const rand = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const vals = [];
  for (let i = 0; i < reps; i += 1) {
    const sample = perHousehold.map(() => perHousehold[Math.floor(rand() * perHousehold.length)]);
    vals.push(summarise(sample)[metric]);
  }
  vals.sort((a, b) => a - b);
  return [vals[Math.floor(reps * 0.025)], vals[Math.floor(reps * 0.975)]];
}

function learningCurve(perHousehold) {
  const buckets = [[0, 10], [10, 30], [30, 100], [100, Infinity]];
  return buckets.map(([lo, hi]) => {
    const rows = perHousehold.flat().filter((r) => r.n >= lo && r.n < hi);
    return { history: hi === Infinity ? `${lo}+` : `${lo}-${hi - 1}`, n: rows.length, accuracy: rows.length ? rows.filter((r) => r.shown === r.truth).length / rows.length : null };
  });
}

function calibration(perHousehold) {
  const rows = perHousehold.flat().filter((r) => r.suggested);
  const bins = [[0.55, 0.65], [0.65, 0.75], [0.75, 0.85], [0.85, 1.01]];
  return bins.map(([lo, hi]) => {
    const b = rows.filter((r) => r.confidence >= lo && r.confidence < hi);
    return { bin: `${lo}-${Math.min(hi, 1)}`, n: b.length, observed: b.length ? b.filter((r) => r.hit).length / b.length : null };
  });
}

async function loadFromDb() {
  const { default: pg } = await import('pg');
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!url) throw new Error('DATABASE_URL em falta');
  const client = new pg.Client({ connectionString: url, ssl: url.includes('sslmode=disable') ? false : { rejectUnauthorized: false } });
  await client.connect();
  try {
    // Rows the SMS import saved as "other" automatically were never chosen by a
    // person, so they are not labels. Everything else was picked or corrected by hand.
    const res = await client.query(`
      SELECT household_id, id, date::text AS date, type, description, category
      FROM transactions
      WHERE description IS NOT NULL AND category IS NOT NULL
        AND type IN ('receita', 'despesa', 'renda', 'poupanca')
        AND NOT (category = 'other' AND COALESCE(note, '') ~ '(^|\\|\\s*)SMS(_REF)?:')
      ORDER BY household_id, date, id`);
    const byHousehold = new Map();
    for (const row of res.rows) {
      if (!byHousehold.has(row.household_id)) byHousehold.set(row.household_id, []);
      byHousehold.get(row.household_id).push({ id: Number(row.id), date: row.date, type: row.type, description: row.description, category: row.category });
    }
    return [...byHousehold.values()].filter((t) => t.length >= 5).map((transactions, i) => ({ householdId: i, transactions }));
  } finally {
    await client.end();
  }
}

function pct(x) { return x === null || x === undefined ? '  -  ' : `${(x * 100).toFixed(1)}%`; }

async function main() {
  const useDb = args.has('--db');
  const households = useDb ? await loadFromDb() : buildSyntheticHouseholds();
  const report = { modelVersion: MODEL_VERSION, data: useDb ? 'db' : 'synthetic', households: households.length, threshold: SUGGEST_THRESHOLD, strategies: {} };

  for (const name of Object.keys(STRATEGIES)) {
    const per = households.map((h) => evaluateHousehold(h.transactions, name));
    report.strategies[name] = {
      ...summarise(per),
      accuracyCI95: bootstrap(per, 'accuracy'),
      macroF1CI95: bootstrap(per, 'macroF1'),
      learningCurve: learningCurve(per),
      ...(name === 'model' ? { calibration: calibration(per), sources: countSources(per) } : {}),
    };
  }

  if (args.has('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  const total = report.strategies.model.n;
  console.log(`Categorias ${MODEL_VERSION} | dados: ${report.data} | ${report.households} famílias, ${total} transacções | limiar ${SUGGEST_THRESHOLD}\n`);
  console.log('Estratégia   Exactidão (IC95)            Macro-F1 (IC95)             Cobertura  Precisão quando sugere');
  for (const [name, s] of Object.entries(report.strategies)) {
    console.log(`${name.padEnd(12)} ${pct(s.accuracy)} (${pct(s.accuracyCI95[0])}-${pct(s.accuracyCI95[1])})   ${pct(s.macroF1)} (${pct(s.macroF1CI95[0])}-${pct(s.macroF1CI95[1])})   ${pct(s.coverage).padStart(7)}    ${pct(s.precisionWhenSuggested)}`);
  }
  console.log('\nCurva de aprendizagem (exactidão pelo nº de transacções anteriores da família):');
  const names = Object.keys(report.strategies);
  console.log(`histórico   ${names.map((n) => n.padStart(9)).join('')}`);
  report.strategies.model.learningCurve.forEach((row, i) => {
    console.log(`${row.history.padEnd(10)}  ${names.map((n) => pct(report.strategies[n].learningCurve[i].accuracy).padStart(9)).join('')}   (n=${row.n})`);
  });
  console.log('\nCalibração do modelo (confiança declarada vs acerto observado):');
  for (const c of report.strategies.model.calibration) console.log(`  ${c.bin.padEnd(10)} acerto ${pct(c.observed)}  (n=${c.n})`);
  console.log('\nOrigem das sugestões:', JSON.stringify(report.strategies.model.sources));
}

function countSources(per) {
  const out = {};
  for (const r of per.flat()) if (r.suggested) out[r.source] = (out[r.source] || 0) + 1;
  return out;
}

main().catch((err) => { console.error(err.message); process.exit(1); });
