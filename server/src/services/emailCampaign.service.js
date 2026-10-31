const crypto = require('crypto');
const { db } = require('../config/db');
const logger = require('../utils/logger');
const emailService = require('./email.service');

/**
 * Campanhas de email do admin.
 *
 * Cada campanha guarda a lista de destinatários na base de dados e é enviada
 * em lotes pequenos, com pausa entre lotes e um limite diário (o Gmail gratuito
 * aceita cerca de 500 destinatários por dia). Se o servidor reiniciar a meio,
 * a campanha continua de onde parou quando o servidor volta a arrancar.
 */

const num = (value, fallback) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const settings = () => ({
  batchSize: num(process.env.EMAIL_BATCH_SIZE, 10),
  batchDelayMs: num(process.env.EMAIL_BATCH_DELAY_MS, 120_000),
  dailyLimit: num(process.env.EMAIL_DAILY_LIMIT, 450),
});

const running = new Set();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function initEmailCampaignSchema() {
  const statements = [
    'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT FALSE',
    'ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_opt_out_at TIMESTAMP',
    `CREATE TABLE IF NOT EXISTS email_campaigns (
      id SERIAL PRIMARY KEY,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'sending',
      total INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS email_campaign_recipients (
      campaign_id INTEGER NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      sent_at TIMESTAMP,
      PRIMARY KEY (campaign_id, user_id)
    )`,
    'CREATE INDEX IF NOT EXISTS idx_email_recipients_status ON email_campaign_recipients (campaign_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_email_recipients_sent_at ON email_campaign_recipients (sent_at)',
    // Sem políticas: a API pública do Supabase não lê estas tabelas; o backend (dono) continua a ler.
    'ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY',
    'ALTER TABLE email_campaign_recipients ENABLE ROW LEVEL SECURITY',
  ];
  try {
    for (const sql of statements) await db.execute({ sql, args: [] });
    logger.info('Email campaign tables initialized or already exist.');
  } catch (error) {
    logger.warn(`Failed to initialize email campaign tables: ${error.message}`);
  }
}

// ── Cancelar subscrição ──────────────────────────────────────────────────────

function unsubscribeSecret() {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || '';
}

function unsubscribeToken(userId) {
  return crypto
    .createHmac('sha256', unsubscribeSecret())
    .update(`unsubscribe:${Number(userId)}`)
    .digest('base64url')
    .slice(0, 32);
}

function verifyUnsubscribeToken(userId, token) {
  if (!userId || typeof token !== 'string' || !unsubscribeSecret()) return false;
  const expected = Buffer.from(unsubscribeToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function apiBaseUrl() {
  const base = process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3001';
  return base.replace(/\/+$/, '');
}

function unsubscribeUrl(userId) {
  return `${apiBaseUrl()}/api/email/unsubscribe?u=${Number(userId)}&t=${unsubscribeToken(userId)}`;
}

async function setOptOut(userId, optOut) {
  await db.execute({
    sql: 'UPDATE public.users SET email_opt_out = ?, email_opt_out_at = ? WHERE id = ?',
    args: [optOut, optOut ? new Date() : null, Number(userId)],
  });
}

// ── Conteúdo ─────────────────────────────────────────────────────────────────

// O corpo dos pedidos passa pelo filtro xss do app.js, que escapa "<", ">" e "&".
// O admin escreve texto simples, por isso desfazemos esse escape e voltamos a
// escapar tudo ao montar o HTML.
function decodeEntities(value) {
  return String(value ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstName(name) {
  const first = String(name || '').trim().split(/\s+/)[0];
  return first || '';
}

function personalize(text, name) {
  const first = firstName(name);
  return text.replace(/\{\s*nome\s*\}/gi, first || 'amigo(a)');
}

function linkify(escaped) {
  return escaped.replace(/https?:\/\/[^\s<]+/g, (url) => {
    const clean = url.replace(/[.,;:!?)]+$/, '');
    const rest = url.slice(clean.length);
    return `<a href="${clean}" style="color:#d97706;">${clean}</a>${rest}`;
  });
}

function renderEmail({ subject, body, name, userId }) {
  const personalized = personalize(body, name);
  const link = unsubscribeUrl(userId);
  const footerText = 'Recebeu este email porque tem uma conta no Mwanga, um produto NexoVibe.';

  const text = `${personalized}\n\n—\n${footerText}\nPara deixar de receber estes emails: ${link}`;

  const paragraphs = personalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6;">${linkify(escapeHtml(p)).replace(/\n/g, '<br>')}</p>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="background:#ffffff;border-radius:12px;padding:28px 24px;border:1px solid #e5e7eb;">
      <div style="font-size:20px;font-weight:bold;color:#d97706;margin-bottom:20px;">Mwanga ✦</div>
      <div style="font-size:15px;">${paragraphs}</div>
    </div>
    <p style="font-size:12px;color:#6b7280;line-height:1.5;text-align:center;margin:16px 8px 0;">
      ${escapeHtml(footerText)}<br>
      <a href="${link}" style="color:#6b7280;">Deixar de receber estes emails</a>
    </p>
  </div>
</body></html>`;

  return {
    subject: personalize(subject, name),
    text,
    html,
    headers: {
      'List-Unsubscribe': `<${link}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

// ── Público-alvo e campanhas ─────────────────────────────────────────────────

const AUDIENCE_WHERE = `email IS NOT NULL AND email LIKE '%_@_%._%' AND COALESCE(email_opt_out, FALSE) = FALSE`;

async function countAudience() {
  const result = await db.execute({ sql: `SELECT COUNT(*) AS count FROM public.users WHERE ${AUDIENCE_WHERE}`, args: [] });
  return Number(result.rows[0]?.count || 0);
}

async function sentInLast24h() {
  const result = await db.execute({
    sql: `SELECT COUNT(*) AS count FROM email_campaign_recipients WHERE status = 'sent' AND sent_at >= NOW() - INTERVAL '24 hours'`,
    args: [],
  });
  return Number(result.rows[0]?.count || 0);
}

function validateContent({ subject, body }) {
  const cleanSubject = decodeEntities(subject).replace(/[\r\n]+/g, ' ').trim();
  const cleanBody = decodeEntities(body).replace(/\r\n/g, '\n').trim();
  if (!cleanSubject || !cleanBody) return { error: 'Assunto e mensagem são obrigatórios.' };
  if (cleanSubject.length > 150) return { error: 'O assunto pode ter no máximo 150 caracteres.' };
  if (cleanBody.length > 20000) return { error: 'A mensagem é demasiado longa (máximo 20 000 caracteres).' };
  return { subject: cleanSubject, body: cleanBody };
}

async function sendTest({ subject, body, adminId }) {
  const admin = await db.execute({ sql: 'SELECT id, name, email FROM public.users WHERE id = ?', args: [adminId] });
  const user = admin.rows[0];
  if (!user?.email) throw new Error('A sua conta de admin não tem email.');
  const message = renderEmail({ subject: `[TESTE] ${subject}`, body, name: user.name, userId: user.id });
  await emailService.send({ to: user.email, ...message });
  return user.email;
}

async function activeCampaign() {
  const result = await db.execute({ sql: `SELECT id FROM email_campaigns WHERE status = 'sending' LIMIT 1`, args: [] });
  return result.rows[0] || null;
}

async function createCampaign({ subject, body, adminId }) {
  const created = await db.execute({
    sql: 'INSERT INTO email_campaigns (subject, body, created_by) VALUES (?, ?, ?) RETURNING id',
    args: [subject, body, adminId],
  });
  const id = created.rows[0].id;
  const inserted = await db.execute({
    sql: `INSERT INTO email_campaign_recipients (campaign_id, user_id, email, name)
          SELECT ?, id, LOWER(TRIM(email)), name FROM public.users WHERE ${AUDIENCE_WHERE}
          ON CONFLICT DO NOTHING`,
    args: [id],
  });
  await db.execute({ sql: 'UPDATE email_campaigns SET total = ? WHERE id = ?', args: [inserted.rowCount || 0, id] });
  logger.info(`Email campaign ${id} created for ${inserted.rowCount || 0} recipients by admin ${adminId}`);
  processCampaign(id);
  return { id, total: inserted.rowCount || 0 };
}

async function cancelCampaign(id) {
  const result = await db.execute({
    sql: `UPDATE email_campaigns SET status = 'cancelled', finished_at = NOW() WHERE id = ? AND status = 'sending'`,
    args: [Number(id)],
  });
  return result.rowCount > 0;
}

async function campaignStatus(id) {
  const result = await db.execute({ sql: 'SELECT status FROM email_campaigns WHERE id = ?', args: [id] });
  return result.rows[0]?.status;
}

/**
 * Envia a campanha lote a lote. Corre em segundo plano; nunca é aguardada por um pedido HTTP.
 */
async function processCampaign(id) {
  if (running.has(id)) return;
  running.add(id);
  try {
    for (;;) {
      if ((await campaignStatus(id)) !== 'sending') return;

      const { batchSize, batchDelayMs, dailyLimit } = settings();
      const allowance = dailyLimit - (await sentInLast24h());
      if (allowance <= 0) {
        logger.info(`Email campaign ${id}: daily limit of ${dailyLimit} reached, waiting.`);
        await sleep(15 * 60_000);
        continue;
      }

      // Volta a ler a preferência no momento do envio: quem cancelou a subscrição
      // depois de a campanha começar já não recebe.
      const batch = await db.execute({
        sql: `SELECT r.user_id, r.email, r.name, COALESCE(u.email_opt_out, FALSE) AS opted_out
              FROM email_campaign_recipients r
              JOIN public.users u ON u.id = r.user_id
              WHERE r.campaign_id = ? AND r.status = 'pending'
              ORDER BY r.user_id
              LIMIT ?`,
        args: [id, Math.min(batchSize, allowance)],
      });

      if (batch.rows.length === 0) {
        await db.execute({
          sql: `UPDATE email_campaigns SET status = 'sent', finished_at = NOW() WHERE id = ? AND status = 'sending'`,
          args: [id],
        });
        logger.info(`Email campaign ${id} finished.`);
        return;
      }

      const campaign = (await db.execute({ sql: 'SELECT subject, body FROM email_campaigns WHERE id = ?', args: [id] })).rows[0];

      for (const recipient of batch.rows) {
        if (recipient.opted_out) {
          await markRecipient(id, recipient.user_id, 'skipped', null);
          continue;
        }
        try {
          const message = renderEmail({ subject: campaign.subject, body: campaign.body, name: recipient.name, userId: recipient.user_id });
          await emailService.send({ to: recipient.email, ...message });
          await markRecipient(id, recipient.user_id, 'sent', null);
        } catch (error) {
          logger.warn(`Email campaign ${id}: failed for user ${recipient.user_id}: ${error.message}`);
          await markRecipient(id, recipient.user_id, 'failed', String(error.message || error).slice(0, 300));
        }
      }

      await sleep(batchDelayMs);
    }
  } catch (error) {
    logger.error(`Email campaign ${id} stopped by an error: ${error.message}`);
  } finally {
    running.delete(id);
  }
}

async function markRecipient(campaignId, userId, status, error) {
  await db.execute({
    sql: `UPDATE email_campaign_recipients SET status = ?, error = ?, sent_at = ${status === 'sent' ? 'NOW()' : 'NULL'}
          WHERE campaign_id = ? AND user_id = ?`,
    args: [status, error, campaignId, userId],
  });
}

async function resumePendingCampaigns() {
  try {
    const result = await db.execute({ sql: `SELECT id FROM email_campaigns WHERE status = 'sending'`, args: [] });
    for (const row of result.rows) {
      logger.info(`Resuming email campaign ${row.id}`);
      processCampaign(row.id);
    }
  } catch (error) {
    logger.warn(`Could not resume email campaigns: ${error.message}`);
  }
}

async function listCampaigns() {
  const result = await db.execute({
    sql: `SELECT c.id, c.subject, c.status, c.total, c.created_at, c.finished_at,
                 u.name AS created_by_name,
                 COUNT(*) FILTER (WHERE r.status = 'sent') AS sent,
                 COUNT(*) FILTER (WHERE r.status = 'failed') AS failed,
                 COUNT(*) FILTER (WHERE r.status = 'skipped') AS skipped,
                 COUNT(*) FILTER (WHERE r.status = 'pending') AS pending
          FROM email_campaigns c
          LEFT JOIN email_campaign_recipients r ON r.campaign_id = c.id
          LEFT JOIN public.users u ON u.id = c.created_by
          GROUP BY c.id, u.name
          ORDER BY c.created_at DESC
          LIMIT 20`,
    args: [],
  });
  return result.rows.map((row) => ({
    ...row,
    total: Number(row.total || 0),
    sent: Number(row.sent || 0),
    failed: Number(row.failed || 0),
    skipped: Number(row.skipped || 0),
    pending: Number(row.pending || 0),
  }));
}

module.exports = {
  initEmailCampaignSchema,
  unsubscribeToken,
  verifyUnsubscribeToken,
  unsubscribeUrl,
  setOptOut,
  decodeEntities,
  renderEmail,
  validateContent,
  countAudience,
  sentInLast24h,
  sendTest,
  activeCampaign,
  createCampaign,
  cancelCampaign,
  processCampaign,
  resumePendingCampaigns,
  listCampaigns,
  settings,
};
