const { z } = require('zod');
const service = require('../services/aiSettings.service');
const schema = z.object({ provider: z.enum(service.providers), apiKey: z.string().trim().min(10).max(512).regex(/^[\x21-\x7E]+$/) }).strict();
const handle = task => async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try { res.json(await task(req)); }
  catch (error) { res.status(error instanceof z.ZodError ? 400 : error.status || 503).json({ error: error instanceof z.ZodError ? 'INVALID_AI_SETTINGS' : error.status ? error.message : 'AI_SETTINGS_UNAVAILABLE' }); }
};
const get = handle(req => service.status(req.user.householdId, req.user.id));
const save = handle(async req => { const { provider, apiKey } = schema.parse(req.body); await service.save(req.user.householdId, req.user.id, provider, apiKey); return { configured: true, provider, storageAvailable: true, updatedAt: new Date().toISOString() }; });
const test = handle(async req => {
  const data = schema.parse(req.body);
  await service.test(data.provider, data.apiKey);
  return { success: true };
});
const remove = handle(async req => { await service.remove(req.user.householdId, req.user.id); return { configured: false, provider: 'gemini', storageAvailable: /^[a-fA-F0-9]{64}$/.test(process.env.AI_CREDENTIALS_ENCRYPTION_KEY || ''), updatedAt: null }; });
module.exports = { get, save, test, remove, schema };
