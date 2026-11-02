const crypto = require('crypto');
const { db } = require('../config/db');
const providers = ['gemini', 'groq', 'openrouter'];
const settingKey = id => `ai_credentials_${id}`;
function masterKey() {
  const value = process.env.AI_CREDENTIALS_ENCRYPTION_KEY || '';
  if (!/^[a-fA-F0-9]{64}$/.test(value)) throw Object.assign(new Error('AI_KEY_STORAGE_UNAVAILABLE'), { status: 503 });
  return Buffer.from(value, 'hex');
}
function encrypt(apiKey, householdId, userId, provider) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', masterKey(), iv);
  cipher.setAAD(Buffer.from(`${householdId}:${userId}:${provider}`));
  const data = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  return { v: 1, provider, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64'), updatedAt: new Date().toISOString() };
}
function decrypt(record, householdId, userId) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey(), Buffer.from(record.iv, 'base64'));
  decipher.setAAD(Buffer.from(`${householdId}:${userId}:${record.provider}`));
  decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(record.data, 'base64')), decipher.final()]).toString('utf8');
}
async function read(householdId, userId) {
  const result = await db.execute({ sql: 'SELECT value FROM settings WHERE household_id = ? AND key = ?', args: [householdId, settingKey(userId)] });
  return result.rows[0]?.value ? JSON.parse(result.rows[0].value) : null;
}
async function credentials(householdId, userId) {
  if (!userId) return null;
  const record = await read(householdId, userId);
  return record ? { provider: record.provider, apiKey: decrypt(record, householdId, userId) } : null;
}
async function status(householdId, userId) {
  const record = await read(householdId, userId);
  return { configured: !!record, provider: record?.provider || 'gemini', updatedAt: record?.updatedAt || null, storageAvailable: /^[a-fA-F0-9]{64}$/.test(process.env.AI_CREDENTIALS_ENCRYPTION_KEY || '') };
}
async function save(householdId, userId, provider, apiKey) {
  const record = encrypt(apiKey, householdId, userId, provider);
  await db.execute({ sql: 'INSERT INTO settings (key, value, household_id) VALUES (?, ?, ?) ON CONFLICT (key, household_id) DO UPDATE SET value = EXCLUDED.value', args: [settingKey(userId), JSON.stringify(record), householdId] });
}
async function remove(householdId, userId) {
  await db.execute({ sql: 'DELETE FROM settings WHERE household_id = ? AND key = ?', args: [householdId, settingKey(userId)] });
}
async function test(provider, apiKey) {
  const endpoints = { gemini: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', groq: 'https://api.groq.com/openai/v1/models', openrouter: 'https://openrouter.ai/api/v1/key' };
  try {
    const response = await fetch(endpoints[provider], { headers: provider === 'gemini' ? { 'x-goog-api-key': apiKey } : { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10000), redirect: 'error' });
    if (!response.ok) throw Object.assign(new Error([401, 403].includes(response.status) ? 'AI_KEY_REJECTED' : 'AI_PROVIDER_UNAVAILABLE'), { status: 422 });
    await response.body?.cancel();
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(new Error('AI_PROVIDER_UNAVAILABLE'), { status: 422 });
  }
}

// ─── "Ligar com OpenRouter" (OAuth PKCE) ─────────────────────────────────────
// The user signs in at OpenRouter (Google login works there), approves, and
// OpenRouter hands our server a key tied to the user's own account. The PKCE
// verifier and the resulting key never leave the server.
const CONNECT_TTL_MS = 10 * 60 * 1000;
const pendingKey = state => `ai_oauth_${crypto.createHash('sha256').update(state).digest('hex')}`;
const b64url = buffer => buffer.toString('base64url');
async function startOpenRouterConnect(householdId, userId, callbackUrl, returnTo = 'web') {
  masterKey(); // fail closed before sending the user away
  const pending = await db.execute({ sql: "SELECT key, value FROM settings WHERE household_id = ? AND key LIKE 'ai_oauth_%'", args: [householdId] });
  for (const row of pending.rows) {
    let old = null; try { old = JSON.parse(row.value); } catch { /* corrupt row */ }
    if (!old || old.userId === userId || old.expiresAt < Date.now()) await db.execute({ sql: 'DELETE FROM settings WHERE household_id = ? AND key = ?', args: [householdId, row.key] });
  }
  const state = b64url(crypto.randomBytes(32)), verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const value = JSON.stringify({ userId, verifier, returnTo: returnTo === 'app' ? 'app' : 'web', expiresAt: Date.now() + CONNECT_TTL_MS });
  await db.execute({ sql: 'INSERT INTO settings (key, value, household_id) VALUES (?, ?, ?) ON CONFLICT (key, household_id) DO UPDATE SET value = EXCLUDED.value', args: [pendingKey(state), value, householdId] });
  const url = new URL('https://openrouter.ai/auth');
  url.searchParams.set('callback_url', callbackUrl);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  url.searchParams.set('key_label', 'Mwanga Binth');
  return { url: url.toString() };
}
async function completeOpenRouterConnect(state, code) {
  if (typeof state !== 'string' || !/^[A-Za-z0-9_-]{20,100}$/.test(state)) throw Object.assign(new Error('AI_CONNECT_EXPIRED'), { status: 400 });
  const key = pendingKey(state);
  const found = await db.execute({ sql: 'SELECT household_id, value FROM settings WHERE key = ?', args: [key] });
  const row = found.rows[0];
  if (!row) throw Object.assign(new Error('AI_CONNECT_EXPIRED'), { status: 400 });
  await db.execute({ sql: 'DELETE FROM settings WHERE household_id = ? AND key = ?', args: [row.household_id, key] }); // single use
  const pending = JSON.parse(row.value);
  const result = { returnTo: pending.returnTo || 'web' };
  if (!pending.expiresAt || pending.expiresAt < Date.now()) throw Object.assign(new Error('AI_CONNECT_EXPIRED'), { status: 400, ...result });
  if (typeof code !== 'string' || !/^[\x21-\x7E]{4,512}$/.test(code)) throw Object.assign(new Error('AI_CONNECT_DENIED'), { status: 400, ...result });
  let apiKey;
  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, code_verifier: pending.verifier, code_challenge_method: 'S256' }), signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) { await response.body?.cancel(); throw new Error('exchange'); }
    apiKey = (await response.json())?.key;
  } catch { throw Object.assign(new Error('AI_CONNECT_FAILED'), { status: 502, ...result }); }
  if (typeof apiKey !== 'string' || !/^[\x21-\x7E]{10,512}$/.test(apiKey)) throw Object.assign(new Error('AI_CONNECT_FAILED'), { status: 502, ...result });
  await save(row.household_id, pending.userId, 'openrouter', apiKey);
  return result;
}
module.exports = { providers, encrypt, decrypt, credentials, status, save, remove, test, startOpenRouterConnect, completeOpenRouterConnect };
