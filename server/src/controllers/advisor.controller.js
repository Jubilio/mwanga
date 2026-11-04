const { z } = require('zod');
const advisor = require('../services/advisor/advisor.service');
const { whatsappConfigured } = require('../services/advisor/advisorSweep');
const { resolveLanguage } = require('../services/binthLanguage');
const logger = require('../utils/logger');

const lang = (req) => resolveLanguage(req.query?.language || req.get('Accept-Language'));
const ids = (req) => ({ householdId: req.user.householdId, userId: req.user.id });

function handle(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
      const known = { EMPTY: 400, FULL: 409, BAD_KIND: 400, BAD_DATE: 400 };
      if (known[error.message]) return res.status(known[error.message]).json({ error: error.message, code: error.message });
      logger.error({ err: error.message }, '[Advisor] request failed');
      res.status(500).json({ error: 'Não foi possível carregar a consultora agora.' });
    }
  };
}

const settingsSchema = z.object({
  level: z.enum(advisor.LEVELS).optional(),
  quietStart: z.number().int().min(0).max(23).optional(),
  quietEnd: z.number().int().min(0).max(23).optional(),
  weekly: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
  titheRate: z.number().min(0).max(0.5).nullable().optional(),
  savingsRate: z.number().min(0).max(0.8).nullable().optional(),
}).strict();

const planSchema = z.object({
  kind: z.enum(advisor.PLAN_KINDS),
  title: z.string().trim().min(1).max(120),
  data: z.record(z.any()).refine(v => JSON.stringify(v).length <= 20000, 'plan too large'),
}).strict();

const reminderSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), text: z.string().trim().min(1).max(140) }).strict();
const memorySchema = z.object({ fact: z.string().trim().min(1).max(200) }).strict();

module.exports = {
  today: handle(async (req, res) => res.json(await advisor.getToday(req.user.householdId, req.user.id, lang(req)))),
  plan: handle(async (req, res) => res.json(await advisor.getPlanOverview(req.user.householdId, req.user.id, lang(req)))),
  weekly: handle(async (req, res) => res.json(await advisor.getWeekly(req.user.householdId, req.user.id))),
  monthClose: handle(async (req, res) => res.json(await advisor.getMonthClose(req.user.householdId, req.user.id, req.query?.month))),

  getSettings: handle(async (req, res) => res.json({ ...(await advisor.getSettings(req.user.householdId)), whatsappAvailable: whatsappConfigured(require('../services/whatsapp.service')) })),
  updateSettings: handle(async (req, res) => {
    const changes = settingsSchema.parse(req.body);
    res.json(await advisor.updateSettings(req.user.householdId, changes));
  }),

  listMemory: handle(async (req, res) => { const { householdId, userId } = ids(req); res.json(await advisor.listMemory(householdId, userId)); }),
  addMemory: handle(async (req, res) => { const { householdId, userId } = ids(req); res.status(201).json(await advisor.addMemory(householdId, userId, memorySchema.parse(req.body).fact)); }),
  deleteMemory: handle(async (req, res) => { const { householdId, userId } = ids(req); await advisor.deleteMemory(householdId, userId, Number(req.params.id)); res.json({ success: true }); }),
  clearMemory: handle(async (req, res) => { const { householdId, userId } = ids(req); await advisor.clearMemory(householdId, userId); res.json({ success: true }); }),

  listPlans: handle(async (req, res) => res.json(await advisor.listPlans(req.user.householdId))),
  createPlan: handle(async (req, res) => { const { householdId, userId } = ids(req); res.status(201).json(await advisor.createPlan(householdId, userId, planSchema.parse(req.body))); }),
  archivePlan: handle(async (req, res) => { await advisor.archivePlan(req.user.householdId, Number(req.params.id)); res.json({ success: true }); }),

  listReminders: handle(async (req, res) => { const { householdId, userId } = ids(req); res.json(await advisor.listReminders(householdId, userId)); }),
  createReminder: handle(async (req, res) => { const { householdId, userId } = ids(req); res.status(201).json(await advisor.createReminder(householdId, userId, reminderSchema.parse(req.body))); }),
  deleteReminder: handle(async (req, res) => { const { householdId, userId } = ids(req); await advisor.deleteReminder(householdId, userId, Number(req.params.id)); res.json({ success: true }); }),
};
