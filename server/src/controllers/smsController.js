const { db } = require('../config/db');
const smsParserService = require('../services/smsParserService');
const logger = require('../utils/logger');
const { z } = require('zod');

const parseSmsSchema = z.object({
  raw_text: z.string().min(1).max(5000).trim(),
}).strict();

exports.parseSmsMessage = async (req, res, next) => {
  try {
    const { raw_text } = parseSmsSchema.parse(req.body);
    const householdId = req.user?.householdId || null;

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
        VALUES (?, ?, ?, ?, ?) RETURNING id
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
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    logger.error('Error in parseSmsMessage:', error);
    next(error);
  }
};
