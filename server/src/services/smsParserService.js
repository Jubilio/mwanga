const axios = require('axios');
const logger = require('../utils/logger');

const bankSignatures = [
  { bank: 'mKesh', regex: /\bmKesh\b/i },
  { bank: 'Vodacom M-Pesa', regex: /\bM-Pesa\b|\bVodacom\b/i },
  { bank: 'Millennium BIM', regex: /millennium\s*bim|\bbim\b/i },
  { bank: 'BCI', regex: /\bBCI\b/i },
];

function normalizeText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function parseMoneyValue(raw) {
  if (!raw) return null;

  const cleaned = String(raw)
    .replace(/[^\d.,-]/g, '')
    .trim();

  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const decimalSeparator = lastComma > lastDot ? ',' : '.';

  let normalized = cleaned;
  if (decimalSeparator === ',') {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = normalized.replace(/,/g, '');
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractMoney(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const amount = parseMoneyValue(match[1]);
      if (amount !== null) return amount;
    }
  }
  return null;
}

function extractDateTime(text) {
  const now = new Date();
  let datePart = null;
  let timePart = null;

  const timeBeforeDate = text.match(/(?:as|às)\s*(\d{1,2}:\d{2}).*?(?:dia\s*)?(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  const dateBeforeTime = text.match(/(?:dia\s*)?(\d{1,2}\/\d{1,2}\/\d{2,4}).*?(?:as|às)\s*(\d{1,2}:\d{2})/i);
  const dateOnly = text.match(/(?:dia\s*)?(\d{1,2}\/\d{1,2}\/\d{2,4})/i);

  if (timeBeforeDate) {
    timePart = timeBeforeDate[1];
    datePart = timeBeforeDate[2];
  } else if (dateBeforeTime) {
    datePart = dateBeforeTime[1];
    timePart = dateBeforeTime[2];
  } else if (dateOnly) {
    datePart = dateOnly[1];
  }

  if (!datePart) {
    return `${now.toISOString().slice(0, 10)}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
  }

  const [dayRaw, monthRaw, yearRaw] = datePart.split('/');
  const day = Number.parseInt(dayRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  let year = Number.parseInt(yearRaw, 10);

  if (yearRaw.length === 2) {
    year += year >= 70 ? 1900 : 2000;
  }

  const [hour = '00', minute = '00'] = (timePart || '00:00').split(':');
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

function detectTransactionType(lowerText) {
  if (/\btransferiste\b|\btransferiu\b|\benviou\b/.test(lowerText)) return 'transfer_out';
  if (/\brecebeste\b|\btransferencia recebida\b|\btransferência recebida\b/.test(lowerText)) return 'transfer_in';
  if (/\blevantaste\b|\blevantamento\b/.test(lowerText)) return 'levantamento';
  if (/\bdepositaste\b|\bdeposito\b|\bdepósito\b/.test(lowerText)) return 'deposito';
  if (/\bcreditad[oa]\b/.test(lowerText)) return 'credit';
  if (/\bpagamento\b|\bpagaste\b|\bcompra\b/.test(lowerText)) return 'payment';
  if (/\btaxa\b|\bcobranca\b|\bcobrança\b/.test(lowerText)) return 'fee';
  if (/\bdebitad[oa]\b|\bdebito\b|\bdébito\b/.test(lowerText)) return 'debit';
  return 'unknown';
}

function inferCurrency(text) {
  if (/\bUSD\b/i.test(text)) return 'USD';
  if (/\bEUR\b/i.test(text)) return 'EUR';
  if (/\bZAR\b/i.test(text)) return 'ZAR';
  return 'MZN';
}

const parseWithRegex = (inputText) => {
  const text = normalizeText(inputText);
  const lowerText = text.toLowerCase();

  const result = {
    is_financial: false,
    bank_name: null,
    transaction_type: 'unknown',
    transaction_id: null,
    account_number: null,
    amount: null,
    currency: inferCurrency(text),
    fee_amount: null,
    balance_after: null,
    recipient_name: null,
    recipient_account: null,
    agent_code: null,
    description: text || null,
    transaction_datetime: extractDateTime(text),
    confidence_score: 0.0,
  };

  for (const sig of bankSignatures) {
    if (sig.regex.test(text)) {
      result.bank_name = sig.bank;
      break;
    }
  }

  const financialHints = /\b(conta|saldo|taxa|referencia|referência|transfer|creditad|debitad|levant|pagamento|pagaste|recebeste|deposit)\b/i.test(text);
  if (!result.bank_name && !financialHints) {
    return result;
  }

  result.is_financial = true;
  result.transaction_type = detectTransactionType(lowerText);

  result.amount = extractMoney(text, [
    /(?:valor\s+de|creditad[oa]\s+com|debitad[oa](?:\s+no\s+valor\s+de)?|transferiste|transferiu|recebeste|levantaste|depositaste|pagaste)\s*([\d.,\s]+)\s*(?:MT|MZN|USD|EUR|ZAR)\b/i,
    /(?:foi\s+debitad[oa]\s+no\s+valor\s+de)\s*([\d.,\s]+)\s*(?:MT|MZN|USD|EUR|ZAR)\b/i,
    /([\d.,\s]+)\s*(?:MT|MZN|USD|EUR|ZAR)\b/i,
  ]);

  result.fee_amount = extractMoney(text, [
    /taxa[:\s]+([\d.,\s]+)\s*(?:MT|MZN|USD|EUR|ZAR)?\b/i,
    /comissao[:\s]+([\d.,\s]+)\s*(?:MT|MZN|USD|EUR|ZAR)?\b/i,
  ]);

  result.balance_after = extractMoney(text, [
    /saldo(?:\s+disponivel)?[:\s]+([\d.,\s]+)\s*(?:MT|MZN|USD|EUR|ZAR)?\b/i,
    /saldo\s+apos[:\s]+([\d.,\s]+)\s*(?:MT|MZN|USD|EUR|ZAR)?\b/i,
  ]);

  const accountMatch = text.match(/conta\s+([0-9][0-9-]*)/i);
  if (accountMatch) result.account_number = accountMatch[1];

  const recipientMatch = text.match(/para\s+(.+?)\s+\(([\d+]{7,15})\)/i);
  if (recipientMatch) {
    result.recipient_name = recipientMatch[1].trim();
    result.recipient_account = recipientMatch[2].trim();
  }

  const simpleRecipientMatch = text.match(/para\s+([A-Za-zÀ-ÿ'\- ]{3,60})/i);
  if (!result.recipient_name && simpleRecipientMatch) {
    result.recipient_name = simpleRecipientMatch[1].trim();
  }

  const refMatch = text.match(/(?:ref|referencia|referência)[:\s]+([A-Za-z0-9._/-]+)/i);
  if (refMatch) result.transaction_id = refMatch[1];

  const agentMatch = text.match(/agente\s+([A-Za-z0-9-]+)/i);
  if (agentMatch) result.agent_code = agentMatch[1];

  if (result.transaction_type === 'unknown' && result.fee_amount && !result.amount) {
    result.transaction_type = 'fee';
    result.amount = result.fee_amount;
  }

  let confidence = 0.2;
  if (result.bank_name) confidence += 0.18;
  if (result.amount !== null) confidence += 0.28;
  if (result.transaction_type !== 'unknown') confidence += 0.18;
  if (result.transaction_id) confidence += 0.08;
  if (result.account_number || result.recipient_account) confidence += 0.05;
  if (result.balance_after !== null) confidence += 0.05;
  if (result.fee_amount !== null) confidence += 0.05;
  if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text)) confidence += 0.05;

  result.confidence_score = Math.max(0.1, Math.min(confidence, 0.96));

  if (result.amount === null && result.transaction_type !== 'fee') {
    result.confidence_score = Math.min(result.confidence_score, 0.45);
  }

  return result;
};

const SYSTEM_PROMPT = `Voce e um motor de extracao estruturada de transacoes financeiras para a plataforma Mwanga em Mocambique.

Regras obrigatorias:
1. Retorne APENAS JSON valido.
2. Se algum campo nao existir, retorne null.
3. Valores monetarios devem ser decimal com ponto.
4. Datas devem estar em formato ISO 8601 (YYYY-MM-DDTHH:MM:SS).
5. Nao invente dados.
6. Detecte automaticamente tipo de transacao, banco ou operadora e moeda.
7. Se a mensagem nao for financeira, retorne { "is_financial": false }.

Estrutura obrigatoria:
{
  "is_financial": true,
  "bank_name": "",
  "transaction_type": "",
  "transaction_id": "",
  "account_number": "",
  "amount": 0.00,
  "currency": "MZN",
  "fee_amount": 0.00,
  "balance_after": 0.00,
  "recipient_name": "",
  "recipient_account": "",
  "agent_code": "",
  "description": "",
  "transaction_datetime": "",
  "confidence_score": 0.0
}

transaction_type deve ser um de: debit, credit, transfer_out, transfer_in, levantamento, deposito, payment, fee, unknown`;

const parseWithLLM = async (text) => {
  try {
    const res = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Analise a seguinte mensagem SMS e extraia os dados estruturados:\n\n"""\n${text}\n"""\n\nRetorne apenas JSON valido.` }],
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      timeout: 12000, // 12s timeout to prevent hanging on mobile
    });

    const raw = res.data.content?.map((block) => block.text || '').join('').trim();
    const cleanJson = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (parsed.is_financial && !parsed.confidence_score) {
      parsed.confidence_score = 0.88;
    }

    logger.info('[LLM Parser] Successfully parsed SMS with LLM');
    return parsed;
  } catch (error) {
    logger.error('[LLM Parser] Fallback parsing failed:', error.message);
    throw new Error('Falha no motor inteligente de extracao. O formato pode ser invalido.');
  }
};

const parseSMS = async (text) => {
  logger.info('[ParserEngine] Received SMS for parsing');

  const regexResult = parseWithRegex(text);

  if (regexResult.is_financial && regexResult.confidence_score >= 0.82) {
    logger.info(`[ParserEngine] Regex path matched with ${regexResult.confidence_score} confidence.`);
    return regexResult;
  }

  if (process.env.ANTHROPIC_API_KEY) {
    logger.info('[ParserEngine] Using LLM fallback for SMS');
    return parseWithLLM(text);
  }

  logger.warn('[ParserEngine] LLM fallback unavailable. Returning regex output.');
  return regexResult;
};

module.exports = {
  parseSMS,
  parseWithRegex,
  parseMoneyValue,
};
