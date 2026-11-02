const { db } = require('../config/db');
const logger = require('../utils/logger');
const scoringService = require('./scoring.service');
const loanService = require('./loan.service');
const { logAction } = require('../utils/audit');

const getApplicationData = async (householdId, partner, amount, months) => {
  // 1. Fetch User Salary for Affordability Check
  const settingsRes = await db.execute({
    sql: 'SELECT value FROM settings WHERE household_id = ? AND key = ?',
    args: [householdId, 'user_salary']
  });
  const salary = parseFloat(settingsRes.rows[0]?.value || 0);

  // 2. Determine Rate based on Partner
  let rate = 0.231; // Default Prime Rate AA
  let isAnnual = true;

  const p = partner.toLowerCase();
  if (p.includes('bim')) { rate = 0.261; isAnnual = true; }
  else if (p.includes('bci')) { rate = 0.281; isAnnual = true; }
  else if (p.includes('micro')) { rate = 0.10; isAnnual = false; }
  else if (p.includes('xitique')) { rate = 0; isAnnual = false; }

  // 3. Calculate Installment & Check 1/3 Rule
  const { monthlyPayment } = loanService.calculateLoan(amount, rate, months, isAnnual);
  const maxAllowed = salary / 3;

  if (salary > 0 && monthlyPayment > maxAllowed) {
    throw new Error('AFFORDABILITY_EXCEEDED');
  }

  return { salary, rate, isAnnual, monthlyPayment, maxAllowed };
};

// O Mwanga não concede crédito: encaminha o pedido para um parceiro
// licenciado pelo Banco de Moçambique, que decide e entrega o dinheiro.
// Por isso guardamos o consentimento para o cálculo do score e a referência
// do contrato do parceiro quando ele confirma o desembolso.
async function initCreditSchema() {
  const statements = [
    'ALTER TABLE public.credit_applications ADD COLUMN IF NOT EXISTS risk_score integer',
    'ALTER TABLE public.credit_applications ADD COLUMN IF NOT EXISTS score_consent_at TIMESTAMP',
    'ALTER TABLE public.credit_applications ADD COLUMN IF NOT EXISTS partner_reference TEXT',
    'ALTER TABLE public.credit_applications ADD COLUMN IF NOT EXISTS partner_disbursed_at TIMESTAMP',
  ];
  try {
    for (const sql of statements) await db.execute({ sql, args: [] });
    logger.info('credit_applications compliance columns initialized or already exist.');
  } catch (error) {
    logger.warn(`Failed to initialize credit_applications columns: ${error.message}`);
  }
}

const submitApplication = async (userId, householdId, data, files) => {
  const { amount, months, partner, purpose, scoreConsent } = data;
  if (scoreConsent !== true) throw new Error('CONSENT_REQUIRED');

  const { monthlyPayment } = await getApplicationData(householdId, partner, amount, months);

  // Calculate Credit Score
  const { score, riskLevel, breakdown } = await scoringService.calculateScore(userId, householdId);

  // Get file paths
  const biPath = files['biDocument'] ? files['biDocument'][0].filename : null;
  const residenciaPath = files['residenciaDocument'] ? files['residenciaDocument'][0].filename : null;
  const rendaPath = files['rendaDocument'] ? files['rendaDocument'][0].filename : null;
  const selfiePath = files['selfieDocument'] ? files['selfieDocument'][0].filename : null;

  const result = await db.execute({
    sql: `
      INSERT INTO credit_applications (
        household_id, amount, months, partner, purpose, status, risk_score,
        bi_path, residencia_path, renda_path, selfie_path, score_consent_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NOW()) RETURNING id
    `,
    args: [householdId, amount, months, partner, purpose, score, biPath, residenciaPath, rendaPath, selfiePath]
  });
  const applicationId = Number(result.rows?.[0]?.id || result.lastInsertRowid || 0);

  // Proactively update user score
  await scoringService.updateUserInfo(userId, score);

  await logAction(userId, 'CREDIT_SCORE_CONSENT', 'CREDIT_APPLICATION', applicationId);

  return { id: applicationId, score, riskLevel, breakdown, monthlyPayment };
};

const getApplications = async (householdId) => {
  const result = await db.execute({
    sql: 'SELECT * FROM credit_applications WHERE household_id = ? ORDER BY created_at DESC',
    args: [householdId]
  });
  return result.rows;
};

const getLoans = async (householdId) => {
  const result = await db.execute({
    sql: 'SELECT * FROM loans WHERE household_id = ? ORDER BY created_at DESC',
    args: [householdId]
  });
  return result.rows;
};

/**
 * Regista que o parceiro licenciado entregou o dinheiro. O Mwanga não move
 * fundos: isto só cria o plano de prestações para o utilizador acompanhar a
 * dívida, ligado à referência do contrato do parceiro.
 */
const recordPartnerDisbursement = async (applicationId, { partnerReference, rate } = {}) => {
  if (!partnerReference) throw new Error('PARTNER_REFERENCE_REQUIRED');
  // 1. Fetch application details
  const appResult = await db.execute({
    sql: 'SELECT * FROM credit_applications WHERE id = ?',
    args: [applicationId]
  });

  const app = appResult.rows[0];
  if (!app) throw new Error('NOT_FOUND');
  if (app.status !== 'pending' && app.status !== 'approved') {
    throw new Error('INVALID_STATUS');
  }

  const userResult = await db.execute({
    sql: 'SELECT id FROM users WHERE household_id = ? LIMIT 1',
    args: [app.household_id]
  });
  const userId = userResult.rows[0].id;

  const partner = app.partner || '';
  const isAnnual = !partner.toLowerCase().includes('micro') && !partner.toLowerCase().includes('xitique');

  const loanId = await loanService.disburseLoan(
    app.id,
    userId,
    app.household_id,
    app.amount,
    rate || (isAnnual ? 0.231 : 0.10),
    app.months,
    isAnnual
  );

  await db.execute({
    sql: 'UPDATE credit_applications SET partner_reference = ?, partner_disbursed_at = NOW() WHERE id = ?',
    args: [partnerReference, app.id],
  });

  return loanId;
};

module.exports = {
  submitApplication,
  getApplications,
  getLoans,
  recordPartnerDisbursement,
  getApplicationData,
  initCreditSchema
};
