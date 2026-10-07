import { readFileSync } from 'node:fs';
const read = language => JSON.parse(readFileSync(new URL(`../src/locales/${language}/translation.json`, import.meta.url), 'utf8'));
function flatten(value, prefix = '') {
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child) ? Object.entries(flatten(child, path)) : [[path, child]];
  }));
}
const pt = flatten(read('pt')), en = flatten(read('en'));
const placeholders = value => [...String(value).matchAll(/{{\s*([^}]+?)\s*}}/g)].map(m => m[1]).sort().join(',');
const errors = [];
for (const key of new Set([...Object.keys(pt), ...Object.keys(en)])) {
  if (!(key in pt) || !(key in en)) errors.push(`Missing key: ${key}`);
  else if (typeof pt[key] !== typeof en[key] || Array.isArray(pt[key]) !== Array.isArray(en[key])) errors.push(`Type mismatch: ${key}`);
  else if (placeholders(pt[key]) !== placeholders(en[key])) errors.push(`Interpolation mismatch: ${key}`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Translation keys and placeholders match (${Object.keys(pt).length} keys).`);
