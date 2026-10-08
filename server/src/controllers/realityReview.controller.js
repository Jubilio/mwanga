const { z } = require('zod');
const service = require('../services/realityReview.service');
const { invalidateDashboardCache } = require('./dashboard.controller');
const commandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start') }).strict(), z.object({ action: z.literal('defer') }).strict(), z.object({ action: z.literal('finish') }).strict(),
  z.object({ action: z.literal('confirm'), section: z.enum(service.GROUPS), fingerprint: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
]);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value);
const amount = z.number().finite().min(-1e12).max(1e12).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.01);
const adjustmentSchema = z.object({ requestId: z.string().uuid(), accountId: z.number().int().positive().nullable(), expectedBalance: amount, balance: amount, asOf: day, reason: z.string().trim().min(3).max(200) }).strict().refine(value => value.accountId !== null || value.balance >= 0);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Maputo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const handler = task => async (req, res, next) => {
  try { res.set('Cache-Control', 'no-store'); res.json(await task(req)); }
  catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'INVALID_REVIEW_DATA' });
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
};
const get = handler(req => service.getReview(req.user.householdId, req.user.id));
const visit = handler(req => service.visit(req.user.householdId, req.user.id));
const change = handler(req => service.changeReview(req.user.householdId, req.user.id, commandSchema.parse(req.body)));
const reconcile = handler(async req => {
  const data = adjustmentSchema.parse(req.body);
  if (data.asOf > today()) throw Object.assign(new Error('FUTURE_DATE'), { status: 400 });
  const result = await service.reconcile(req.user.householdId, req.user.id, data);
  await invalidateDashboardCache(req.user.householdId);
  return result;
});
module.exports = { get, visit, change, reconcile, adjustmentSchema, commandSchema };
