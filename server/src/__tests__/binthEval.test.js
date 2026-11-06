// Keeps the Binth evaluation harness working (the cases file is valid, the
// checks catch what they should, isolation is detected). The quality run itself
// needs a real model: npm run eval:binth.
jest.mock('../config/db', () => require('../../evals/binth/fixture'));
jest.mock('../config/redis', () => ({ redis: null }));
jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));
const fs = require('fs');
const path = require('path');
const { check, foreignQueries, runCases } = require('../../evals/binth/run');
const { callBinth } = require('../services/binthService');

const { cases } = JSON.parse(fs.readFileSync(path.join(__dirname, '../../evals/binth/cases.json'), 'utf8'));
const KINDS = ['normal', 'ambiguous', 'insufficient', 'injection', 'other_user', 'limits', 'failure'];

test('the case file covers every kind with unique ids', () => {
  expect(new Set(cases.map(c => c.id)).size).toBe(cases.length);
  for (const kind of KINDS) expect(cases.some(c => c.kind === kind)).toBe(true);
  for (const c of cases) {
    expect(KINDS).toContain(c.kind);
    expect(typeof c.message).toBe('string');
    expect(Object.keys(c.expect || {}).length).toBeGreaterThan(0);
  }
});

describe('checks', () => {
  const tx = { action: 'add_transaction', payload: { tipo: 'despesa', valor: 150 } };
  test('proposal values and types', () => {
    const c = { kind: 'normal', expect: { proposal: { action: 'add_transaction', tipo: 'despesa', valor: 150 } } };
    expect(check(c, { message: 'Queres que registe?', pending_action: tx }).pass).toBe(true);
    expect(check(c, { message: 'ok', pending_action: { ...tx, payload: { ...tx.payload, valor: 1500 } } }).failures[0]).toMatch(/expected 150/);
    expect(check(c, { message: 'ok' }).pass).toBe(false);
  });
  test('a clarifying question cannot come with a proposal', () => {
    const c = { kind: 'ambiguous', expect: { asksQuestion: true } };
    expect(check(c, { message: 'Qual das dívidas pagaste?' }).pass).toBe(true);
    expect(check(c, { message: 'Qual?', pending_action: tx }).pass).toBe(false);
  });
  test('thousand separators from pt-MZ formatting still match', () => {
    const c = { kind: 'normal', expect: { mentionsAny: ['3 500'] } };
    expect(check(c, { message: 'Tens MT 3 500 no M-Pesa.' }).pass).toBe(true);
  });
  test('an AI case answered by the local fallback fails', () => {
    const c = { kind: 'normal', expect: { noProposal: true } };
    expect(check(c, { message: 'x', data: { local_intelligence: true } }).failures[0]).toMatch(/did not answer/);
  });
  test('queries for another household are caught', () => {
    expect(foreignQueries([{ sql: 'SELECT * FROM debts WHERE household_id = ? AND status = ?', args: [7, 'pending'] }])).toHaveLength(0);
    expect(foreignQueries([{ sql: 'SELECT * FROM t WHERE date >= ? AND household_id = ?', args: ['2026-11-01', 99] }])).toHaveLength(1);
    expect(check({ kind: 'other_user', expect: { noProposal: true } }, { message: 'ok' }, { queries: [{ sql: 'SELECT 1 FROM x WHERE user_id = ?', args: [12] }] }).pass).toBe(false);
  });
});

test('the failure cases pass against the real Binth code with the provider down', async () => {
  const saved = { ...process.env };
  process.env.NODE_ENV = 'production';
  delete process.env.GEMINI_API_KEY; delete process.env.GROQ_API_KEY; delete process.env.OPENROUTER_API_KEY;
  try {
    const results = await runCases({
      cases: cases.filter(c => c.kind === 'failure' || c.kind === 'other_user'),
      provider: 'gemini', offline: true, callBinth, log: () => {},
    });
    const failed = results.filter(r => r.kind === 'failure' && !r.pass);
    expect(failed.map(r => `${r.id}: ${r.failures.join('; ')}`)).toEqual([]);
    expect(results.filter(r => r.kind === 'other_user').every(r => !r.failures.some(f => /another household/.test(f)))).toBe(true);
  } finally {
    process.env = saved;
  }
});
