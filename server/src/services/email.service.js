const nodemailer = require('nodemailer');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const logger = require('../utils/logger');
const { hintEmail } = require('../utils/privacyMask');

const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

/**
 * Email Service
 *
 * Dois modos de envio, escolhidos pelas variáveis de ambiente:
 * - Gmail API (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN): envia por HTTPS.
 *   É o modo a usar no plano gratuito do Render, que bloqueia as portas SMTP (25, 465, 587).
 * - SMTP (EMAIL_HOST, EMAIL_USER, EMAIL_PASS...): para servidores que permitem SMTP.
 * Sem nenhum dos dois, os emails são só escritos no log (desenvolvimento).
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.mode = 'log';
    this.gmailClient = null;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    // Monta a mensagem completa (MIME) sem a enviar; a Gmail API recebe-a já pronta.
    this.composer = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });
    this.init();
  }

  async init() {
    const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
    if (GMAIL_CLIENT_ID && GMAIL_CLIENT_SECRET && GMAIL_REFRESH_TOKEN) {
      this.gmailClient = new OAuth2Client(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET);
      this.gmailClient.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
      this.mode = 'gmail';
      try {
        await this.gmailClient.getAccessToken();
        logger.info(`Email service initialized (Gmail API) for ${this.fromAddress() || 'the authorised account'}.`);
      } catch (error) {
        logger.error(`Email service (Gmail API) could not get an access token: ${describeError(error)}`);
      }
      return;
    }

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    if (!user || !pass) {
      logger.info('Email not configured (no GMAIL_* or EMAIL_* variables). Emails will only be logged.');
      return;
    }

    // pool reutiliza a mesma ligação SMTP quando se enviam campanhas em lotes.
    // Os timeouts curtos fazem uma porta bloqueada falhar em segundos em vez de minutos.
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user, pass },
      pool: true,
      maxConnections: 1,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
    this.mode = 'smtp';
    try {
      await this.transporter.verify();
      logger.info('Email service initialized (SMTP).');
    } catch (error) {
      logger.error(`Email service (SMTP) failed to connect: ${describeError(error)}. On Render's free plan SMTP ports are blocked; use the Gmail API variables instead.`);
    }
  }

  isConfigured() {
    return this.mode !== 'log';
  }

  fromAddress() {
    return process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.GMAIL_SENDER || '';
  }

  fromHeader(fromName) {
    const name = (fromName || process.env.EMAIL_FROM_NAME || 'Mwanga · NexoVibe').replace(/"/g, '');
    return `"${name}" <${this.fromAddress()}>`;
  }

  /**
   * Envia um email genérico (campanhas do admin). Lança erro se falhar,
   * para quem chama poder registar a falha por destinatário.
   */
  async send({ to, subject, text, html, headers, fromName }) {
    const message = {
      from: this.fromHeader(fromName),
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
      to,
      subject,
      text,
      html,
      headers,
    };

    if (this.mode === 'gmail') return this.sendWithGmail(message);
    if (this.mode === 'smtp') return this.transporter.sendMail(message);

    logger.info(`[EMAIL LOG] "${subject}" para ${hintEmail(to)}`);
    return { logged: true };
  }

  async sendWithGmail(message) {
    const { message: raw } = await this.composer.sendMail(message);
    const { token } = await this.gmailClient.getAccessToken();
    try {
      const response = await axios.post(
        GMAIL_SEND_URL,
        { raw: Buffer.from(raw).toString('base64url') },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 20_000 },
      );
      return { messageId: response.data?.id };
    } catch (error) {
      throw new Error(describeError(error));
    }
  }

  passwordResetUrl(token) {
    const base = String(process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');
    return `${base}/reset-password?token=${encodeURIComponent(token)}`;
  }

  /**
   * Sends a password reset email with a link and a 6-digit code.
   * @returns {Promise<boolean>} whether the email was handed to the provider
   */
  async sendPasswordReset(to, token, name, code) {
    const resetUrl = this.passwordResetUrl(token);
    const safeName = escapeHtml(name || '');
    const subject = code ? `Mwanga: o seu código é ${code}` : 'Mwanga: recuperar a senha';
    const codeLine = code ? `\n\nOu, no Mwanga, escreva este código: ${code}` : '';
    const text = `Olá ${name || ''},\n\nRecebemos um pedido para criar uma nova senha no Mwanga.\n\nAbra este link:\n${resetUrl}${codeLine}\n\nO link e o código valem durante 1 hora.\n\nSe não foi você que pediu, ignore este email. A sua senha continua a mesma.\n\nEquipa Mwanga`;

    const codeBlock = code ? `
        <p style="margin: 24px 0 8px; color: #334155;">Ou, na app, escreva este código:</p>
        <div style="font-size: 32px; letter-spacing: 8px; font-weight: 800; color: #0f172a; background: #f1f5f9; border-radius: 10px; padding: 14px; text-align: center;">${code}</div>` : '';

    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0ea5e9; margin-top: 0;">Mwanga ✦</h2>
        <p>Olá <strong>${safeName}</strong>,</p>
        <p>Recebemos um pedido para criar uma nova senha. Toque no botão:</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Criar nova senha</a>
        </div>${codeBlock}
        <p style="font-size: 0.9rem; color: #64748b; margin-top: 24px;">O link e o código valem durante <strong>1 hora</strong>.</p>
        <p style="font-size: 0.9rem; color: #64748b;">Se não foi você que pediu, ignore este email. A sua senha continua a mesma.</p>
      </div>
    `;

    if (!this.isConfigured()) {
      logger.warn(`[EMAIL] Password reset requested for ${hintEmail(to)}, but email is not configured. The user cannot receive it.`);
      if (this.isDevelopment) logger.info(`[RECOVERY LINK]: ${resetUrl} code=${code}`);
      return false;
    }

    try {
      await this.send({ to, subject, text, html, fromName: 'Mwanga ✦' });
      return true;
    } catch (error) {
      logger.error(`Failed to send password reset email to ${hintEmail(to)}: ${describeError(error)}`);
      if (this.isDevelopment) logger.info(`[RECOVERY LINK]: ${resetUrl} code=${code}`);
      return false;
    }
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function describeError(error) {
  const apiError = error?.response?.data?.error;
  if (apiError) {
    const detail = typeof apiError === 'string' ? apiError : apiError.message || apiError.status;
    const extra = error.response.data.error_description;
    return [detail, extra].filter(Boolean).join(': ');
  }
  return error?.message || String(error);
}

module.exports = new EmailService();
