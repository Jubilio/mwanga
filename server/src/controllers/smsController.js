const { db } = require('../config/db');
const smsParserService = require('../services/smsParserService');
const logger = require('../utils/logger');

exports.parseSmsMessage = async (req, res, next) => {
  try {
    const { raw_text } = req.body;
    const householdId = req.user.household_id;

    if (!raw_text) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    // 1. Process with the Parser Engine (Regex + Fallback)
    const parsedData = await smsParserService.parseSMS(raw_text);

    // 2. Save parsing result to database for tracing & audit
    const insert = db.prepare(`
      INSERT INTO financial_messages (tenant_id, raw_text, source_detected, parsed_json, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      householdId,
      raw_text,
      parsedData.bank_name || 'unknown',
      JSON.stringify(parsedData),
      parsedData.is_financial && parsedData.confidence_score > 0 ? 'parsed' : 'error'
    );

    res.status(200).json({
      success: true,
      data: {
        message_id: result.lastInsertRowid,
        parsed_data: parsedData
      }
    });

  } catch (error) {
    logger.error('Error in parseSmsMessage:', error);
    res.status(500).json({ success: false, message: 'Falha durante o parsing da mensagem SMS. Tente novamente mais tarde.' });
  }
};
