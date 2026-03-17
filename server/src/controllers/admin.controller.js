const { db } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Admin Controller
 * Responsible for platform-wide monitoring and management.
 */
const getUsers = async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM users ORDER BY created_at DESC',
      args: []
    });
    // Map data to ensure no crashes if columns are missing
    const users = await Promise.all(result.rows.map(async u => {
      // Fetch documents for each user
      const docs = await db.execute({
        sql: 'SELECT * FROM kyc_documents WHERE user_id = ?',
        args: [u.id]
      });
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        kyc_status: u.kyc_status || 'pending',
        credit_score: u.credit_score || 0,
        role: u.role || 'user',
        created_at: u.created_at,
        documents: docs.rows
      };
    }));
    res.json(users);
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
    
    // 3. Loan Stats - Check if table exists implicitly by catching error
    let loanStats = { rows: [{ total_disbursed: 0, total_loans: 0, avg_rate: 0 }] };
    try {
      loanStats = await db.execute(`
        SELECT 
          SUM(principal) as total_disbursed,
          COUNT(*) as total_loans,
          AVG(interest_rate) as avg_rate
        FROM loans
      `);
    } catch (e) {
      logger.warn('Loans table might not exist yet:', e.message);
    }

    // 4. Pending Applications
    let pendingApps = { rows: [{ count: 0 }] };
    try {
      pendingApps = await db.execute("SELECT COUNT(*) as count FROM credit_applications WHERE status = 'pending'");
    } catch (e) {
      logger.warn('Credit Applications table might not exist yet:', e.message);
    }

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
