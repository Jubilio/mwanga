const { db } = require('../config/db');
const logger = require('../utils/logger');
const scoringService = require('./scoring.service');
const loanService = require('./loan.service');

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

const submitApplication = async (userId, householdId, data, files) => {
  const { amount, months, partner, purpose } = data;

  const { monthlyPayment } = await getApplicationData(householdId, partner, amount, months);

  // Calculate Credit Score
  const { score, riskLevel } = await scoringService.calculateScore(userId, householdId);

  // Get file paths
  const biPath = files['biDocument'] ? files['biDocument'][0].filename : null;
  const residenciaPath = files['residenciaDocument'] ? files['residenciaDocument'][0].filename : null;
  const rendaPath = files['rendaDocument'] ? files['rendaDocument'][0].filename : null;
  const selfiePath = files['selfieDocument'] ? files['selfieDocument'][0].filename : null;

  const result = await db.execute({
    sql: `
      INSERT INTO credit_applications (
        household_id, amount, months, partner, purpose, status, risk_score,
        bi_path, residencia_path, renda_path, selfie_path
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?) RETURNING id
    `,
    args: [householdId, amount, months, partner, purpose, score, biPath, residenciaPath, rendaPath, selfiePath]
  });
  const applicationId = Number(result.rows?.[0]?.id || result.lastInsertRowid || 0);

  // Proactively update user score
  await scoringService.updateUserInfo(userId, score);

  return { id: applicationId, score, riskLevel, monthlyPayment };
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

const disburseLoan = async (applicationId, manualRate) => {
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
    manualRate || (isAnnual ? 0.231 : 0.10),
    app.months,
    isAnnual
  );

  return loanId;
};

module.exports = {
  submitApplication,
  getApplications,
  getLoans,
  disburseLoan,
  getApplicationData
};
