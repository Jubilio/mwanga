const nodemailer = require('nodemailer');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const logger = require('../utils/logger');

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

    logger.info(`[EMAIL LOG] "${subject}" para ${to}`);
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

  /**
   * Sends a password reset email
   * @param {string} to - Recipient email
   * @param {string} token - The reset token
   * @param {string} name - User's name
   */
  async sendPasswordReset(to, token, name) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    
    const subject = 'Mwanga ✦ - Recuperação de Senha';
    const text = `Olá ${name},\n\nRecebemos um pedido para redefinir a sua senha no Mwanga. Clique no link abaixo para proceder:\n\n${resetUrl}\n\nEste link é válido por 1 hora.\n\nSe não solicitou esta alteração, pode ignorar este email.\n\nAbraço,\nEquipa Mwanga`;
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #0ea5e9;">Mwanga ✦</h2>
        <p>Olá <strong>${name}</strong>,</p>
        <p>Recebemos um pedido para redefinir a sua senha. Clique no botão abaixo para criar uma nova senha:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Senha</a>
        </div>
        <p style="font-size: 0.9rem; color: #64748b;">Este link é válido por <strong>1 hora</strong>.</p>
        <p style="font-size: 0.9rem; color: #64748b;">Se não solicitou esta alteração, pode ignorar este email com segurança.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 0.8rem; color: #94a3b8;">Binth Intelligence - Soluções Financeiras Inteligentes</p>
      </div>
    `;

    if (!this.isConfigured()) {
      logger.info(`[EMAIL LOG] Password reset for ${to}: ${resetUrl}`);
      return true;
    }

    try {
      await this.send({ to, subject, text, html, fromName: 'Mwanga ✦' });
      return true;
    } catch (error) {
      logger.error(`Failed to send password reset email to ${to}: ${describeError(error)}`);
      // Still log the link in dev if sending fails
      if (this.isDevelopment) logger.info(`[RECOVERY LINK]: ${resetUrl}`);
      return false;
    }
  }
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
