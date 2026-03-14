const { db } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Loan Service
 * Responsible for managing loans and payments.
 */
class LoanService {
  /**
   * Calculates loan details based on the blueprint.
   * @param {number} principal 
   * @param {number} rate (monthly rate as decimal, e.g., 0.30 for 30%)
   * @param {number} months 
   * @returns {Object} { interest, total, monthlyPayment }
   */
  calculateLoan(principal, rate, months) {
    const interest = principal * rate * months;
    const total = principal + interest;
    const monthlyPayment = total / months;

    return {
      interest,
      total,
      monthlyPayment
    };
  }

  /**
   * Disburses a loan: creates the loan record and the payment schedule.
   */
  async disburseLoan(applicationId, userId, householdId, principal, rate, months) {
    const { monthlyPayment } = this.calculateLoan(principal, rate, months);

    return await db.batch([
      // 1. Create the Loan record
      {
        sql: `
          INSERT INTO loans (
            user_id, household_id, application_id, principal, 
            interest_rate, term_months, monthly_payment, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'disbursed') RETURNING id
        `,
        args: [userId, householdId, applicationId, principal, rate, months, monthlyPayment]
      },
      // 2. Update Application status
      {
        sql: 'UPDATE credit_applications SET status = ? WHERE id = ?',
        args: ['disbursed', applicationId]
      }
    ]).then(async (results) => {
      const loanId = results[0].lastInsertRowid;
      
      // 3. Generate Payment Schedule (Installments)
      const paymentQueries = [];
      const now = new Date();
      
      for (let i = 1; i <= months; i++) {
        const dueDate = new Date(now);
        dueDate.setMonth(now.getMonth() + i);
        
        paymentQueries.push({
          sql: `
            INSERT INTO loan_payments (
              loan_id, amount_due, due_date, status
            ) VALUES (?, ?, ?, 'pending')
          `,
          args: [loanId, monthlyPayment, dueDate.toISOString().split('T')[0]]
        });
      }
      
      await db.batch(paymentQueries);
      logger.info(`Loan ${loanId} disbursed and payment schedule created for user ${userId}`);
      return loanId;
    });
  }

  /**
   * Records a payment against a loan installment.
   */
  async recordPayment(paymentId, amount) {
    // This would typically involve checking the amount due, updating the status, etc.
    // Simplifying for now.
    await db.execute({
      sql: `
        UPDATE loan_payments 
        SET amount_paid = amount_paid + ?, 
            payment_date = date('now'),
            status = CASE WHEN (amount_paid + ?) >= amount_due THEN 'paid' ELSE 'pending' END
        WHERE id = ?
      `,
      args: [amount, amount, paymentId]
    });
  }
}

module.exports = new LoanService();
