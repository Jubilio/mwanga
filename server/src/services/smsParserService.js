const axios = require('axios');
const logger = require('../utils/logger');

// Regex Matchers for common banks in Mozambique
const bankSignatures = [
  { bank: 'Millennium BIM', regex: /(Millennium bim|bim|millennium)/i },
  { bank: 'Vodacom M-Pesa', regex: /(M-Pesa|mKesh|Vodacom)/i }, // Taking the liberty to group mobile money
  { bank: 'mKesh', regex: /(mKesh)/i },
  { bank: 'BCI', regex: /(BCI)/i }
];

const parseWithRegex = (text) => {
  const result = {
    is_financial: false,
    bank_name: null,
    transaction_type: 'unknown',
    transaction_id: null,
    account_number: null,
    amount: null,
    currency: 'MZN',
    fee_amount: null,
    balance_after: null,
    recipient_name: null,
    recipient_account: null,
    agent_code: null,
    description: null,
    transaction_datetime: new Date().toISOString(),
    confidence_score: 0.0
  };

  // 1. Detect Bank
  for (const sig of bankSignatures) {
    if (sig.regex.test(text)) {
      result.bank_name = sig.bank;
      result.is_financial = true;
      break;
    }
  }

  // If no bank signature but has amount, assume financial
  const amountMatch = text.match(/(\d+[.,]\d{2})(?=\s*MT|\s*MZN|MT|MZN)?/i);
  if (amountMatch) {
    result.is_financial = true;
    result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  if (!result.is_financial) return result;

  // 2. Detect Type
  const lowerText = text.toLowerCase();
  if (lowerText.includes('debitada') || lowerText.includes('pagamento')) {
    result.transaction_type = 'debit';
  } else if (lowerText.includes('creditada')) {
    result.transaction_type = 'credit';
  } else if (lowerText.includes('transferiste') || lowerText.includes('transferencia')) {
    result.transaction_type = 'transfer_out';
  } else if (lowerText.includes('levantaste') || lowerText.includes('levantamento')) {
    result.transaction_type = 'withdrawal';
  } else if (lowerText.includes('recebeste')) {
    result.transaction_type = 'transfer_in';
  }

  // 3. Detect Accounts and Refs
  const accountMatch = text.match(/conta (\d+[-]?\d*)/i);
  if (accountMatch) result.account_number = accountMatch[1];

  const refMatch = text.match(/(?:ref|referencia|ref:)\s*([A-Za-z0-9.-]+)/i);
  if (refMatch) result.transaction_id = refMatch[1];

  // 4. Detect Fee and Balance
  const feeMatch = text.match(/taxa[:\s]+(\d+[.,]\d{2})/i);
  if (feeMatch) result.fee_amount = parseFloat(feeMatch[1].replace(/,/g, ''));

  const balanceMatch = text.match(/saldo(?: disponivel)?[:\s]+(\d+[.,]\d{2})/i);
  if (balanceMatch) result.balance_after = parseFloat(balanceMatch[1].replace(/,/g, ''));

  // 5. Detect Agent (M-Pesa specific)
  const agentMatch = text.match(/agente\s+([A-Za-z0-9]+)/i);
  if (agentMatch) result.agent_code = agentMatch[1];

  // 6. Confianca
  // If we got amount and type, and we know the bank, it's pretty good
  let conf = 0.5;
  if (result.amount) conf += 0.2;
  if (result.transaction_type !== 'unknown') conf += 0.2;
  if (result.bank_name) conf += 0.05;

  result.confidence_score = Math.min(conf, 0.95); // leave 5% for LLM to be better

  // If type is unknown, returning confidence < 0.8
  if (result.transaction_type === 'unknown') result.confidence_score = 0.4;

  return result;
};

const SYSTEM_PROMPT = `Você é um motor de extração estruturada de transações financeiras para a plataforma SaaS Mwanga (gestão financeira familiar em Moçambique).

Sua tarefa é analisar mensagens SMS bancárias e retornar dados estruturados em JSON válido.

Regras obrigatórias:
1. Retorne APENAS JSON válido — sem markdown, sem backticks, sem texto adicional.
2. Se algum campo não existier, retorne null.
3. Valores monetários devem ser decimal com ponto.
4. Datas devem estar em formato ISO 8601 (YYYY-MM-DDTHH:MM:SS), aproxime do ano atual se não explicitado.
5. Não invente dados.
6. Detecte automaticamente: tipo de transação, banco ou operadora, moeda.
7. Se a mensagem não for financeira, retorne: { "is_financial": false }

Estrutura obrigatória:
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

transaction_type deve ser um de: debit, credit, transfer_out, transfer_in, withdrawal, deposit, payment, fee, unknown

Regras de normalização:
- "debitada" → debit
- "Transferiste" → transfer_out
- "levantaste" → withdrawal
- "creditada" → credit
- Se mencionar taxa → fee_amount
- Se mencionar saldo → balance_after`;

const parseWithLLM = async (text) => {
  try {
    const res = await axios.post("https://api.anthropic.com/v1/messages", {
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Analise a seguinte mensagem SMS e extraia os dados estruturados:\n\n"""\n${text}\n"""\n\nRetorne apenas JSON válido.` }],
    }, {
      headers: { 
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      }
    });

    const raw = res.data.content?.map(b => b.text || "").join("").trim();
    // Limpar delimitadores markdown caso a IA retorne
    const cleanJson = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsed = JSON.parse(cleanJson);
    logger.info('[LLM Parser] Successfully parsed SMS with LLM');
    // Forçar trust um bocado mais alta na LLM se devolver um objeto válido com is_financial true
    if (parsed.is_financial && !parsed.confidence_score) parsed.confidence_score = 0.88;
    return parsed;
  } catch (error) {
    logger.error('[LLM Parser] Fallback parsing failed:', error.message);
    throw new Error('Falha no motor inteligente de extração. O formato pode ser inválido.');
  }
};

const parseSMS = async (text) => {
  logger.info('[ParserEngine] Received SMS for parsing');
  // 1. Regex Fast Path
  const regexResult = parseWithRegex(text);
  
  // Se o regex tiver muita certeza (> 80%), devolve logo: é rápido e grátis.
  if (regexResult.is_financial && regexResult.confidence_score >= 0.80) {
    logger.info(`[ParserEngine] Regex path matched with ${regexResult.confidence_score} confidence.`);
    return regexResult;
  }

  // 2. Se regex não for conclusivo ou a mensagem não for catchada, usar LLM fallback
  // Mas apenas se tivermos a API key
  if (process.env.ANTHROPIC_API_KEY) {
    logger.info('[ParserEngine] Using LLM Fallback for SMS');
    return await parseWithLLM(text);
  } else {
    logger.warn('[ParserEngine] LLM fallback unavailable due to missing ANTHROPIC_API_KEY. Defaulting to regex output.');
    return regexResult;
  }
};

module.exports = {
  parseSMS,
  parseWithRegex
};
