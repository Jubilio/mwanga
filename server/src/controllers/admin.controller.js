const { db } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Admin Controller
 * Responsible for platform-wide monitoring and management.
 */
const getUsers = async (req, res) => {
  try {
    const result = await db.execute({
      sql: `
        SELECT
          u.id,
          u.name,
          u.email,
          u.kyc_status,
          u.credit_score,
          u.role,
          u.created_at,
          d.id as document_id,
          d.document_type,
          d.document_url,
          d.uploaded_at as document_created_at
        FROM public.users u
        LEFT JOIN public.kyc_documents d ON d.user_id = u.id
        ORDER BY u.created_at DESC, d.uploaded_at DESC
      `,
      args: []
    });

    const userMap = new Map();

    for (const row of result.rows) {
      if (!userMap.has(row.id)) {
        userMap.set(row.id, {
          id: row.id,
          name: row.name,
          email: row.email,
          kyc_status: row.kyc_status || 'pending',
          credit_score: row.credit_score || 0,
          role: row.role || 'user',
          created_at: row.created_at,
          documents: []
        });
      }

      if (row.document_id) {
        userMap.get(row.id).documents.push({
          id: row.document_id,
          document_type: row.document_type,
          document_url: row.document_url,
          created_at: row.document_created_at
        });
      }
    }

    const users = Array.from(userMap.values());
    res.json(users);
  } catch (error) {
    logger.error('Error fetching users for admin:', error);
    res.status(500).json({ error: 'Falha ao buscar utilizadores' });
  }
};

const getPlatformStats = async (req, res) => {
  try {
    // 1. Total Users
    const usersCount = await db.execute('SELECT COUNT(*) as count FROM public.users');
    
    // 2. KYC Stats
    const kycStats = await db.execute('SELECT kyc_status, COUNT(*) as count FROM public.users GROUP BY kyc_status');
    
    // 3. Loan Stats - Check if table exists implicitly by catching error
    let loanStats = { rows: [{ total_disbursed: 0, total_loans: 0, avg_rate: 0 }] };
    try {
      loanStats = await db.execute(`
        SELECT 
          SUM(principal) as total_disbursed,
          COUNT(*) as total_loans,
          AVG(interest_rate) as avg_rate
        FROM public.loans
      `);
    } catch (e) {
      logger.warn('Loans table might not exist yet:', e.message);
    }

    // 4. Pending Applications
    let pendingApps = { rows: [{ count: 0 }] };
    try {
      pendingApps = await db.execute("SELECT COUNT(*) as count FROM public.credit_applications WHERE status = 'pending'");
    } catch (e) {
      logger.warn('Credit Applications table might not exist yet:', e.message);
    }

    // 5. Feedback Count
    let feedbackCount = 0;
    try {
      const fCount = await db.execute('SELECT COUNT(*) as count FROM feedbacks WHERE status = ?', ['pending']);
      feedbackCount = Number(fCount.rows[0].count);
    } catch (e) {
      logger.warn('Feedbacks table might not exist yet:', e.message);
    }

    res.json({
      totalUsers: Number(usersCount.rows[0].count),
      kyc: kycStats.rows,
      loans: {
        totalDisbursed: Number(loanStats.rows[0].total_disbursed || 0),
        totalCount: Number(loanStats.rows[0].total_loans || 0),
        avgRate: Number(loanStats.rows[0].avg_rate || 0)
      },
      pendingApplications: Number(pendingApps.rows[0].count),
      feedbackCount,
      kycSummary: {
        approved: Number(kycStats.rows.find((row) => row.kyc_status === 'approved')?.count || 0),
        pending: Number(kycStats.rows.find((row) => row.kyc_status === 'pending')?.count || 0),
        rejected: Number(kycStats.rows.find((row) => row.kyc_status === 'rejected')?.count || 0)
      }
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
      sql: 'UPDATE public.users SET kyc_status = ? WHERE id = ?',
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
