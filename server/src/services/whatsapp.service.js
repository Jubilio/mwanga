const logger = require('../utils/logger');
const { callBinth } = require('./binthService');
const { db } = require('../config/db');

/**
 * WhatsApp Service
 * 
 * Handles abstraction for WhatsApp API providers (Evolution API, Twilio, etc.)
 */
class WhatsAppService {
  constructor() {
    this.provider = process.env.WHATSAPP_PROVIDER || 'evolution'; // 'evolution' or 'twilio'
  }

  /**
   * Processes an incoming message from the webhook
   * @param {Object} payload - Raw payload from the provider
   */
  async handleIncomingMessage(payload) {
    try {
      const { from, text, pushName } = this._parsePayload(payload);
      
      logger.info({ from, pushName }, '[WhatsApp] Message received');

      // 1. Identify user by phone number
      const user = await this._findUserByPhone(from);
      
      if (!user) {
        return {
          reply: `Olá! Sou a Binth, a tua assistente do Mwanga. Notei que este número não está associado a nenhuma conta. Por favor, adiciona o teu número de WhatsApp nas definições da app Mwanga para começarmos! 🚀`,
          recipient: from
        };
      }

      // 2. Call Binth AI with user context
      const binthResponse = await callBinth({
        messages: [{ role: 'user', content: text }],
        householdId: user.household_id,
        userId: user.id
      });

      // 3. Format response for WhatsApp
      const replyText = this._formatBinthResponse(binthResponse);

      return {
        reply: replyText,
        recipient: from
      };
    } catch (error) {
      logger.error({ error }, '[WhatsApp] Error handling incoming message');
      throw error;
    }
  }

  /**
   * Send message via provider
   */
  async sendMessage(to, text) {
    if (this.provider === 'evolution') {
      return this._sendEvolution(to, text);
    } else if (this.provider === 'twilio') {
      return this._sendTwilio(to, text);
    }
  }

  // --- Private Helpers ---

  _parsePayload(payload) {
    if (this.provider === 'evolution') {
      // Evolution API v2 structure
      const msg = payload.data || payload;
      return {
        from: msg.key?.remoteJid?.split('@')[0] || msg.sender?.split('@')[0],
        text: msg.message?.conversation || msg.message?.extendedTextMessage?.text || '',
        pushName: msg.pushName || 'Explorador'
      };
    }
    // Default/Twilio-like
    return {
      from: payload.From?.replace('whatsapp:', ''),
      text: payload.Body,
      pushName: payload.ProfileName || 'Explorador'
    };
  }

  async _findUserByPhone(phone) {
    // We expect the phone number in the DB to be in a standard format (e.g., 25884...)
    // WhatsApp usually sends without the '+' but with country code
    const cleanPhone = phone.replace(/\D/g, '');
    
    const result = await db.execute({
      sql: 'SELECT id, household_id, name FROM public.users WHERE whatsapp_number = ? OR national_id = ? LIMIT 1',
      args: [cleanPhone, cleanPhone]
    });

    return result.rows[0];
  }

  _formatBinthResponse(binth) {
    let text = `*Binth:* ${binth.message}\n\n`;
    
    if (binth.biblical_insight) {
      text += `💡 _${binth.biblical_insight}_\n\n`;
    }

    if (binth.alerta) {
      text += `⚠️ *ALERTA:* ${binth.alerta}\n\n`;
    }

    if (binth.quick_actions && binth.quick_actions.length > 0) {
      text += `🎯 *Sugestões:*\n${binth.quick_actions.map(a => `• ${a}`).join('\n')}`;
    }

    return text;
  }

  async _sendEvolution(to, text) {
    const url = `${process.env.EVOLUTION_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`;
    const apiKey = process.env.EVOLUTION_API_KEY;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey
        },
        body: JSON.stringify({
          number: to,
          options: { delay: 1200, presence: 'composing' },
          textMessage: { text }
        })
      });

      return await response.json();
    } catch (error) {
      logger.error({ error, to }, '[WhatsApp] Failed to send via Evolution');
    }
  }

  async _sendTwilio(to, text) {
    // Implementation for Twilio if needed later
    logger.info({ to, text }, '[WhatsApp] Twilio send placeholder');
  }
}

module.exports = new WhatsAppService();
