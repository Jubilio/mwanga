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
module.exports = { providers, encrypt, decrypt, credentials, status, save, remove, test };
