import { readFileSync, readdirSync } from 'node:fs';
const read = language => JSON.parse(readFileSync(new URL(`../src/locales/${language}/translation.json`, import.meta.url), 'utf8'));
function flatten(value, prefix = '') {
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child) ? Object.entries(flatten(child, path)) : [[path, child]];
  }));
}
const catalogs = { pt: read('pt'), en: read('en') };
const pt = flatten(catalogs.pt), en = flatten(catalogs.en);
const placeholders = value => [...String(value).matchAll(/{{\s*([^}]+?)\s*}}/g)].map(m => m[1]).sort().join(',');
const errors = [];
for (const key of new Set([...Object.keys(pt), ...Object.keys(en)])) {
  if (!(key in pt) || !(key in en)) errors.push(`Missing key: ${key}`);
  else if (typeof pt[key] !== typeof en[key] || Array.isArray(pt[key]) !== Array.isArray(en[key])) errors.push(`Type mismatch: ${key}`);
  else if (placeholders(pt[key]) !== placeholders(en[key])) errors.push(`Interpolation mismatch: ${key}`);
}

// Validate literal translation calls as well as catalog parity. Dynamic keys are
// validated through the paired catalogs and component regression tests.
const srcRoot = new URL('../src/', import.meta.url);
for (const file of readdirSync(srcRoot, { recursive: true }).filter(path => /\.(jsx|js)$/.test(path))) {
  const source = readFileSync(new URL(file, srcRoot), 'utf8');
  for (const match of source.matchAll(/\bt\(\s*['"]([a-zA-Z0-9_.]+)['"]\s*(?=[,)])/g)) {
    const key = match[1];
    for (const language of ['pt', 'en']) {
      const value = key.split('.').reduce((node, part) => node?.[part], catalogs[language]);
      if (value === undefined) errors.push(`Missing referenced key: ${language}:${key} (${file})`);
    }
  }
}

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Translation keys and placeholders match (${Object.keys(pt).length} keys).`);
