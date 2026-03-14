const { db } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Scoring Service
 * Responsible for calculating credit risk scores.
 */
class ScoringService {
  /**
   * Calculates a credit score for a user.
   * Based on the blueprint: income, payment history, transaction history.
   * @param {number} userId 
   * @param {number} householdId 
   * @returns {Object} { score, riskLevel, breakdown }
   */
  async calculateScore(userId, householdId) {
    try {
      logger.info(`Calculating score for user ${userId} in household ${householdId}`);

      let score = 500; // Base score
      const breakdown = {
        base: 500,
        income: 0,
        repayment: 0,
        activity: 0
      };

      // 1. Income Analysis (using transactions or reported income if available)
      // For now, let's look at average monthly income in transactions
      const incomeResult = await db.execute({
        sql: `
          SELECT AVG(amount) as avg_income 
          FROM transactions 
          WHERE household_id = ? AND type = 'receita'
          AND created_at >= date('now', '-3 months')
        `,
        args: [householdId]
      });

      const avgIncome = incomeResult.rows[0]?.avg_income || 0;
      if (avgIncome > 20000) {
        breakdown.income = 200;
      } else if (avgIncome > 10000) {
        breakdown.income = 100;
      } else if (avgIncome > 0) {
        breakdown.income = 50;
      }

      // 2. Repayment History (from loan_payments or debt_payments)
      const paymentResult = await db.execute({
        sql: `
          SELECT 
            COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
            COUNT(*) as total_count
          FROM loan_payments lp
          JOIN loans l ON lp.loan_id = l.id
          WHERE l.household_id = ?
        `,
        args: [householdId]
      });

      const paidCount = paymentResult.rows[0]?.paid_count || 0;
      const totalCount = paymentResult.rows[0]?.total_count || 0;

      if (totalCount > 0) {
        const ratio = paidCount / totalCount;
        if (ratio >= 0.9) breakdown.repayment = 300;
        else if (ratio >= 0.7) breakdown.repayment = 150;
        else if (ratio < 0.5) breakdown.repayment = -200;
      }

      // 3. Activity (M-Pesa/e-mola detected in SMS/Transactions)
      const activityResult = await db.execute({
        sql: `
          SELECT COUNT(*) as activity_count 
          FROM financial_messages 
          WHERE tenant_id = ? AND status = 'parsed'
        `,
        args: [householdId]
      });

      if (activityResult.rows[0]?.activity_count > 10) {
        breakdown.activity = 100;
      }

      score += breakdown.income + breakdown.repayment + breakdown.activity;

      // Cap score between 0 and 1000
      score = Math.max(0, Math.min(1000, score));

      let riskLevel = 'High';
      if (score >= 700) riskLevel = 'Low';
      else if (score >= 500) riskLevel = 'Medium';

      return { score, riskLevel, breakdown };
    } catch (error) {
      logger.error('Error calculating credit score:', error);
      throw error;
    }
  }

  /**
   * Updates the user's credit score in the database.
   */
  async updateUserInfo(userId, score) {
    await db.execute({
      sql: 'UPDATE users SET credit_score = ? WHERE id = ?',
      args: [score, userId]
    });
  }
}

module.exports = new ScoringService();
