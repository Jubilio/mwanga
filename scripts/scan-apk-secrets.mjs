#!/usr/bin/env node
// Looks inside a built APK (or a folder such as dist/) for credentials that must never ship to phones.
// Usage: node scripts/scan-apk-secrets.mjs <file.apk|folder> [--json report.json]
// Exit code 1 when a FAIL finding exists. WARN findings are printed but do not fail the build.
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const FAIL_RULES = [
  ['Private key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ['Google service account', /"type"\s*:\s*"service_account"/],
  ['OpenRouter key', /sk-or-v1-[a-f0-9]{32,}/],
  ['Anthropic key', /sk-ant-[A-Za-z0-9_-]{20,}/],
  ['OpenAI key', /\bsk-(?!or-|ant-)(?:proj-)?[A-Za-z0-9_-]{40,}/],
  ['Stripe live secret', /\b[sr]k_live_[A-Za-z0-9]{20,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\b(?:ghp|gho|ghs|ghu)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{60,}/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Telegram bot token', /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/],
  ['Database URL with password', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^:\s"'/]+:[^@\s"']+@/],
  ['Server secret assignment', /\b(?:JWT_SECRET|WHATSAPP_WEBHOOK_SECRET|PAYSUITE_(?:API_)?(?:TOKEN|SECRET)|OPENROUTER_API_KEY|FIREBASE_SERVICE_ACCOUNT)\s*[:=]\s*["']?[A-Za-z0-9+/_-]{12,}/],
];
// Client keys that are expected in a mobile app but must be restricted in the Google Cloud console.
const WARN_RULES = [
  ['Google API key (must be restricted to com.mwanga.app)', /\bAIza[0-9A-Za-z_-]{35}\b/],
];
const TEXT_FILE = /\.(?:js|mjs|json|html|css|xml|txt|properties|map|arsc|dex|so)$/i;

const [target, ...rest] = process.argv.slice(2);
if (!target) {
  console.error('Usage: node scripts/scan-apk-secrets.mjs <file.apk|folder> [--json report.json]');
  process.exit(2);
}
const jsonIndex = rest.indexOf('--json');
const jsonOut = jsonIndex >= 0 ? rest[jsonIndex + 1] : null;

let root = target;
let cleanup = null;
if (statSync(target).isFile()) {
  root = mkdtempSync(join(tmpdir(), 'apk-scan-'));
  cleanup = root;
  const unzip = spawnSync('unzip', ['-q', '-o', target, '-d', root], { stdio: 'inherit' });
  if (unzip.status !== 0) throw new Error('Could not unzip ' + target);
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

const findings = [];
const hosts = new Set();
for (const file of walk(root)) {
  const rel = relative(root, file);
  if (!TEXT_FILE.test(rel) && !rel.startsWith('assets/')) continue;
  const text = readFileSync(file).toString('latin1');
  for (const [level, rules] of [['FAIL', FAIL_RULES], ['WARN', WARN_RULES]]) {
    for (const [name, rule] of rules) {
      const match = text.match(rule);
      // Never print the full value: the report itself may end up in public logs.
      if (match) findings.push({ level, name, file: rel, sample: match[0].slice(0, 8) + '…' });
    }
  }
  if (/\.(?:js|html|json)$/.test(rel)) {
    for (const m of text.matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) hosts.add(m[1].toLowerCase());
  }
}
if (cleanup) rmSync(cleanup, { recursive: true, force: true });

const fails = findings.filter(f => f.level === 'FAIL');
for (const f of findings) console.log(`${f.level}  ${f.name}  in ${f.file}  (${f.sample})`);
console.log(`\nHTTPS hosts referenced by the app (${hosts.size}):\n  ${[...hosts].sort().join('\n  ')}`);
console.log(fails.length ? `\n${fails.length} secret(s) found. Do not publish this build.` : '\nPASS: no server secrets found.');
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ pass: fails.length === 0, findings, hosts: [...hosts].sort() }, null, 2));
process.exit(fails.length ? 1 : 0);
