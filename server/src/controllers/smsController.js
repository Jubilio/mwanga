const { db } = require('../config/db');
const smsParserService = require('../services/smsParserService');
const logger = require('../utils/logger');

exports.parseSmsMessage = async (req, res, next) => {
  try {
    const { raw_text } = req.body;
    // Fallback if req.user is undefined or missing household_id
    const householdId = req.user?.householdId || null;

    if (!raw_text) {
      return res.status(400).json({ success: false, message: 'Texto da mensagem é obrigatório.' });
    }

    // 1. Process with the Parser Engine (Regex + Fallback)
    const parsedData = await smsParserService.parseSMS(raw_text);

    // 2. Save parsing result to database for tracing & audit
    // Ensure we stringify valid data
    const parsedJsonStr = JSON.stringify(parsedData || {});
    const sourceDetected = parsedData?.bank_name || 'unknown';
    const status = parsedData?.is_financial && parsedData?.confidence_score > 0 ? 'parsed' : 'error';

    const result = await db.execute({
      sql: `
        INSERT INTO financial_messages (tenant_id, raw_text, source_detected, parsed_json, status)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [
        householdId,
        raw_text,
        sourceDetected,
        parsedJsonStr,
        status
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        message_id: Number(result.lastInsertRowid),
        parsed_data: parsedData
      }
    });

  } catch (error) {
    logger.error('Error in parseSmsMessage:', error);
    res.status(500).json({ success: false, message: 'Falha durante o parsing da mensagem SMS. Tente novamente mais tarde.' });
  }
};
