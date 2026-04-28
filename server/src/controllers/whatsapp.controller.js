const whatsAppService = require('../services/whatsapp.service');
const logger = require('../utils/logger');

/**
 * WhatsApp Controller
 * 
 * Handles webhook requests from WhatsApp providers
 */
const whatsAppController = {
  /**
   * Main webhook endpoint
   */
  webhook: async (req, res) => {
    try {
      // 1. Immediately acknowledge the webhook to the provider
      res.status(200).send('OK');

      const payload = req.body;
      
      // Log basic info without being too verbose
      logger.info('[WhatsApp Webhook] Received payload');

      // 2. Process message asynchronously so we don't block the webhook response
      // Most providers expect a response within 1-3 seconds
      whatsAppService.handleIncomingMessage(payload)
        .then(async (result) => {
          if (result && result.reply && result.recipient) {
            await whatsAppService.sendMessage(result.recipient, result.reply);
          }
        })
        .catch(err => {
          logger.error({ err }, '[WhatsApp Controller] Async processing failed');
        });

    } catch (error) {
      logger.error({ error }, '[WhatsApp Controller] Webhook error');
      // Even on error, we usually want to return 200 to prevent provider retries 
      // unless it's a structural error
      if (!res.headersSent) {
        res.status(200).send('OK');
      }
    }
  },

  /**
   * Health check for the webhook
   */
  verify: (req, res) => {
    // Some providers (like Meta) require a GET request to verify the webhook
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        logger.info('[WhatsApp Webhook] Verified');
        return res.status(200).send(challenge);
      }
      return res.sendStatus(403);
    }
    
    // Generic check
    res.status(200).json({ status: 'WhatsApp service is active' });
  }
};

module.exports = whatsAppController;
