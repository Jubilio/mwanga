const cron = require('node-cron');
const { db } = require('../../config/db');
const logger = require('../../utils/logger');
const rules = require('./advisorRules');
const { loadSnapshot } = require('./advisorData');
const advisor = require('./advisor.service');

// The advisor speaks first at most once a day per person, never during quiet
// hours, and only for alerts allowed by the level the person chose. Reminders
// the person set themselves are always delivered on their day.
//
// Alerts come from rules (no AI), so the sweep costs nothing in AI credits.

function inQuietHours(hour, { quietStart, quietEnd }) {
  if (quietStart === quietEnd) return false;
  return quietStart > quietEnd ? (hour >= quietStart || hour < quietEnd) : (hour >= quietStart && hour < quietEnd);
}

async function claimDailySlot(userId, day, alertId) {
  const res = await db.execute({
    sql: 'INSERT INTO advisor_daily (user_id, day, alert_id) VALUES (?, ?, ?) ON CONFLICT (user_id, day) DO NOTHING RETURNING user_id',
    args: [userId, day, alertId],
  });
  return res.rowCount > 0;
}

async function alreadySent(userId, alertId) {
  const res = await db.execute({ sql: 'SELECT 1 FROM advisor_sent_alerts WHERE user_id = ? AND alert_id = ?', args: [userId, alertId] });
  return res.rowCount > 0;
}

async function markSent(userId, alertId) {
  await db.execute({ sql: 'INSERT INTO advisor_sent_alerts (user_id, alert_id) VALUES (?, ?) ON CONFLICT DO NOTHING', args: [userId, alertId] });
}

// WhatsApp only works once the provider is configured on the server (Evolution API).
function whatsappConfigured(whatsapp) {
  if (!whatsapp) return false;
  if (whatsapp.provider === 'evolution') return Boolean(process.env.EVOLUTION_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE);
  return false;
}

// Push (in-app + phone) and, when the person turned it on, WhatsApp.
async function deliver({ user, settings, title, message, url, kind, basis, deps }) {
  const { createNotification, whatsapp } = deps;
  await createNotification({
    householdId: user.household_id,
    userId: user.id,
    title,
    message,
    type: 'advisor',
    channel: 'push',
    tone: 'friendly',
    actionPayload: { url: url || '/insights' },
    metadata: { source: 'advisor', kind },
    sendPush: true,
  });
  let channel = 'push';
  if (settings.whatsapp && user.whatsapp_number && whatsappConfigured(whatsapp)) {
    try {
      await whatsapp.sendMessage(user.whatsapp_number, `*${title}*\n${message}\n\n_${advisor.DISCLAIMER.pt}_`);
      channel = 'push+whatsapp';
    } catch (err) {
      logger.warn({ err: err.message }, '[Advisor] WhatsApp send failed');
    }
  }
  await advisor.logAdvice({ householdId: user.household_id, userId: user.id, kind, channel, summary: `${title} — ${message}`, basis });
}

// Decides what (if anything) one person hears today. Returns what was sent.
async function adviseUser(user, now, deps) {
  const today = rules.todayMz(now);
  const settings = await advisor.getSettings(user.household_id);
  const sent = [];

  // 1. Reminders the person asked for: always on their day (outside quiet hours).
  const hour = rules.hourMz(now);
  if (inQuietHours(hour, settings)) return sent;
  const due = await db.execute({
    sql: 'SELECT id, text FROM advisor_reminders WHERE user_id = ? AND remind_on <= ? AND sent_at IS NULL ORDER BY remind_on ASC LIMIT 3',
    args: [user.id, today],
  }).catch(() => ({ rows: [] }));
  for (const r of due.rows || []) {
    const claimed = await db.execute({ sql: 'UPDATE advisor_reminders SET sent_at = NOW() WHERE id = ? AND sent_at IS NULL RETURNING id', args: [r.id] });
    if (claimed.rowCount === 0) continue;
    await deliver({ user, settings, title: 'Lembrete da Binth', message: r.text, url: '/insights', kind: 'reminder', basis: { reminderId: r.id }, deps });
    sent.push({ kind: 'reminder', id: r.id });
  }

  if (settings.level === 'off') return sent;

  // 2. One proactive message: weekly summary on Monday, month close on the 1st,
  // otherwise the most important new alert allowed by the level.
  const snapshot = await loadSnapshot(user.household_id, user.id, today);
  snapshot.prefs = { ...snapshot.prefs, titheRate: settings.titheRate ?? undefined, savingsRate: settings.savingsRate ?? undefined };
  const alerts = rules.alertsForLevel(rules.buildAlerts(snapshot, today, 'pt'), settings.level);

  let candidate = null;
  for (const a of alerts) {
    if (!(await alreadySent(user.id, a.id))) { candidate = a; break; }
  }
  const urgent = candidate && candidate.priority === 1;

  if (!urgent && today.endsWith('-01')) {
    const close = rules.monthClose(snapshot, rules.monthOf(rules.addDays(today, -1)));
    if (close.income > 0 || close.expenses > 0) {
      candidate = {
        id: `close:${close.month}`, kind: 'month_close',
        title: 'O teu mês em 3 pontos',
        body: `Entrou ${rules.money(close.income)}, saiu ${rules.money(close.expenses)}.${close.highlight ? ` Destaque: gastaste menos ${rules.money(close.highlight.saved)} em ${rules.catLabel(close.highlight.category)}.` : ''} Vê o orçamento proposto para este mês.`,
        action: { to: `/plano?fecho=${close.month}` },
        data: close,
      };
    }
  } else if (!urgent && settings.weekly && settings.level !== 'discreet' && rules.weekdayMz(now) === 'Mon') {
    const w = rules.weeklySummary(snapshot, today);
    if (w.spent > 0 || w.previous > 0) {
      const change = w.change === null ? '' : w.change <= 0 ? ` (${Math.abs(w.change)}% menos que na anterior)` : ` (${w.change}% mais que na anterior)`;
      candidate = {
        id: `weekly:${today}`, kind: 'weekly',
        title: 'Resumo da semana',
        body: `Gastaste ${rules.money(w.spent)}${change}.${w.topCategory ? ` Maior gasto: ${rules.catLabel(w.topCategory.category)}.` : ''}${alerts[0] ? ` A seguir: ${alerts[0].title.toLowerCase()}.` : ''}`,
        action: { to: '/plano?semana=1' },
        data: w,
      };
    }
  }

  if (!candidate || await alreadySent(user.id, candidate.id)) return sent;
  if (!(await claimDailySlot(user.id, today, candidate.id))) return sent;
  await markSent(user.id, candidate.id);
  await deliver({ user, settings, title: candidate.title, message: candidate.body, url: candidate.action?.to, kind: candidate.kind, basis: { alertId: candidate.id, data: candidate.data }, deps });
  sent.push({ kind: candidate.kind, id: candidate.id });
  return sent;
}

async function runAdvisorSweep(now = new Date(), deps = defaultDeps()) {
  const users = await db.execute({
    sql: 'SELECT id, household_id, whatsapp_number FROM public.users WHERE household_id IS NOT NULL ORDER BY id ASC LIMIT 20000',
    args: [],
  }).catch((err) => { logger.warn(`[Advisor] Could not list users: ${err.message}`); return { rows: [] }; });
  let messages = 0;
  for (const user of users.rows || []) {
    try {
      messages += (await adviseUser(user, now, deps)).length;
    } catch (err) {
      logger.warn({ err: err.message, userId: user.id }, '[Advisor] sweep failed for user');
    }
  }
  logger.info(`[Advisor] sweep done: ${messages} messages`);
  return messages;
}

function defaultDeps() {
  return {
    createNotification: require('../notification.service').createNotification,
    whatsapp: require('../whatsapp.service'),
  };
}

// Every hour at :07 between 06:00 and 18:59 UTC (08:00-20:59 in Maputo).
function startAdvisorScheduler() {
  const pattern = process.env.ADVISOR_CRON || '7 6-18 * * *';
  cron.schedule(pattern, () => {
    runAdvisorSweep().catch(err => logger.error(`[Advisor] sweep crashed: ${err.message}`));
  }, { recoverMissedExecutions: false });
  logger.info(`Advisor scheduler started with pattern: ${pattern}`);
}

module.exports = { runAdvisorSweep, adviseUser, inQuietHours, startAdvisorScheduler, whatsappConfigured };
