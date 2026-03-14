const { db } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Admin Controller
 * Responsible for platform-wide monitoring and management.
 */
const getUsers = async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id, name, email, kyc_status, credit_score, created_at FROM users ORDER BY created_at DESC',
      args: []
    });
    res.json(result.rows);
  } catch (error) {
    logger.error('Error fetching users for admin:', error);
    res.status(500).json({ error: 'Falha ao buscar utilizadores' });
  }
};

const getPlatformStats = async (req, res) => {
  try {
    // 1. Total Users
    const usersCount = await db.execute('SELECT COUNT(*) as count FROM users');
    
    // 2. KYC Stats
    const kycStats = await db.execute('SELECT kyc_status, COUNT(*) as count FROM users GROUP BY kyc_status');
    
    // 3. Loan Stats
    const loanStats = await db.execute(`
      SELECT 
        SUM(amount) as total_disbursed,
        COUNT(*) as total_loans,
        AVG(interest_rate) as avg_rate
      FROM loans
    `);

    // 4. Pending Applications
    const pendingApps = await db.execute("SELECT COUNT(*) as count FROM credit_applications WHERE status = 'pending'");

    res.json({
      totalUsers: Number(usersCount.rows[0].count),
      kyc: kycStats.rows,
      loans: {
        totalDisbursed: Number(loanStats.rows[0].total_disbursed || 0),
        totalCount: Number(loanStats.rows[0].total_loans || 0),
        avgRate: Number(loanStats.rows[0].avg_rate || 0)
      },
      pendingApplications: Number(pendingApps.rows[0].count)
    });
  } catch (error) {
    logger.error('Error fetching platform stats:', error);
    res.status(500).json({ error: 'Falha ao buscar estatísticas' });
  }
};

const updateKycStatus = async (req, res) => {
  try {
    const { userId, status } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    await db.execute({
      sql: 'UPDATE users SET kyc_status = ? WHERE id = ?',
      args: [status, userId]
    });

    logger.info(`Admin updated KYC status for user ${userId} to ${status}`);
    res.json({ message: 'Estado KYC atualizado' });
  } catch (error) {
    logger.error('Error updating KYC status:', error);
    res.status(500).json({ error: 'Falha ao atualizar estado KYC' });
  }
};

module.exports = {
  getUsers,
  getPlatformStats,
  updateKycStatus
};
