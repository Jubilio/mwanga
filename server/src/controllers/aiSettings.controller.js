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

// ─── "Ligar com OpenRouter" ─────────────────────────────────────────────────
const startSchema = z.object({ returnTo: z.enum(['web', 'app']).optional().default('web') }).strict();
function publicApiBase(req) {
  const configured = (process.env.API_PUBLIC_URL || '').trim().replace(/\/$/, '');
  return configured || `${req.protocol}://${req.get('host')}`;
}
const startOpenRouter = handle(async req => {
  const { returnTo } = startSchema.parse(req.body || {});
  return service.startOpenRouterConnect(req.user.householdId, req.user.id, `${publicApiBase(req)}/api/ai-connect/openrouter/callback`, returnTo);
});
const PAGES = {
  connected: ['IA ligada', 'A tua conta OpenRouter foi ligada ao Mwanga. A Binth já pode responder com a tua conta.'],
  cancelled: ['Ligação cancelada', 'Não ligámos nenhuma conta. Podes tentar outra vez nas Definições do Mwanga.'],
  expired: ['O pedido expirou', 'O pedido demorou mais de 10 minutos ou já foi usado. Volta às Definições do Mwanga e toca outra vez em "Ligar com OpenRouter".'],
  failed: ['Não foi possível ligar', 'A OpenRouter não confirmou a ligação. Tenta outra vez dentro de alguns minutos.'],
};
function resultPage(result) {
  const [title, text] = PAGES[result];
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Mwanga</title></head>`
    + `<body style="font-family:system-ui,sans-serif;background:#0a4d68;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:16px;box-sizing:border-box">`
    + `<main style="max-width:420px;background:rgba(255,255,255,.08);border-radius:20px;padding:28px;text-align:center"><h1 style="font-size:22px;margin:0 0 12px">${title}</h1><p style="line-height:1.5;margin:0 0 16px">${text}</p>`
    + `<p style="opacity:.8;font-size:14px;margin:0">Podes fechar esta página e voltar à app Mwanga.</p></main></body></html>`;
}
const callbackOpenRouter = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  let result = 'connected', returnTo = 'app';
  if (!req.query.code || !req.query.state) result = 'cancelled';
  else {
    try { ({ returnTo } = await service.completeOpenRouterConnect(String(req.query.state), String(req.query.code))); }
    catch (error) { returnTo = error.returnTo || 'app'; result = error.message === 'AI_CONNECT_EXPIRED' ? 'expired' : error.message === 'AI_CONNECT_DENIED' ? 'cancelled' : 'failed'; }
  }
  const frontend = (process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
  if (returnTo === 'web' && /^https:\/\//.test(frontend)) return res.redirect(303, `${frontend}/settings?tab=ai&ai=${result}`);
  res.type('html').send(resultPage(result));
};
module.exports.startOpenRouter = startOpenRouter;
module.exports.callbackOpenRouter = callbackOpenRouter;
