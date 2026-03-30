const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Email Service
 * Handles sending system emails like password recovery.
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.init();
  }

  async init() {
    try {
      // Configuration from environment variables
      const config = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      };

      // If no SMTP config, we will just log the emails in development
      if (!config.auth.user || !config.auth.pass) {
        logger.info('SMTP configuration missing. Email service will log to console (Development Mode).');
        return;
      }

      this.transporter = nodemailer.createTransport(config);
      await this.transporter.verify();
      logger.info('Email service initialized successfully.');
    } catch (error) {
      logger.error('Email service initialization failed:', error.message);
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

    if (!this.transporter) {
      logger.info(`[EMAIL LOG] Password reset for ${to}: ${resetUrl}`);
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: `"Mwanga ✦" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html
      });
      return true;
    } catch (error) {
      logger.error(`Failed to send password reset email to ${to}:`, error.message);
      // Still log the link in dev if sending fails
      if (this.isDevelopment) logger.info(`[RECOVERY LINK]: ${resetUrl}`);
      return false;
    }
  }
}

module.exports = new EmailService();
