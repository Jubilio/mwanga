const { db } = require('../config/db');
const logger = require('../utils/logger');

const vslaService = {
  createGroup: async (householdId, userId, data) => {
    const { name, description, currency, shareValue, interestRate, meetingFrequency, maxShares, socialFund } = data;
    
    // Start a transaction
    return await db.batch([
      // 1. Create the group
      {
        sql: `
          INSERT INTO vsla_groups (
            household_id, name, description, currency, share_value, 
            interest_rate, meeting_frequency, max_shares_per_member, social_fund_contribution
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *
        `,
        args: [householdId, name, description, currency, shareValue, interestRate, meetingFrequency, maxShares, socialFund]
      },
      // 2. Add the creator as the President
      {
        sql: `
          INSERT INTO vsla_members (group_id, user_id, role)
          VALUES (last_insert_rowid(), ?, 'president')
        `,
        args: [userId]
      }
    ]);
  },

  getGroupsForUser: async (userId) => {
    const result = await db.execute({
      sql: `
        SELECT g.*, m.role
        FROM vsla_groups g
        JOIN vsla_members m ON g.id = m.group_id
        WHERE m.user_id = ? AND m.status = 'active'
        ORDER BY g.created_at DESC
      `,
      args: [userId]
    });
    return result.rows;
  },

  getGroupDetails: async (groupId, userId) => {
    // Verify membership
    const memberCheck = await db.execute({
      sql: `SELECT role FROM vsla_members WHERE group_id = ? AND user_id = ? AND status = 'active'`,
      args: [groupId, userId]
    });
    
    if (memberCheck.rows.length === 0) {
      throw new Error('Not a member of this group');
    }

    const groupResult = await db.execute({
      sql: `SELECT * FROM vsla_groups WHERE id = ?`,
      args: [groupId]
    });

    const membersResult = await db.execute({
      sql: `
        SELECT m.id as member_id, m.role, m.status, u.id as user_id, u.name, u.email
        FROM vsla_members m
        JOIN users u ON m.user_id = u.id
        WHERE m.group_id = ? AND m.status = 'active'
      `,
      args: [groupId]
    });

    const currentCycle = await db.execute({
      sql: `SELECT * FROM vsla_cycles WHERE group_id = ? AND status = 'active' LIMIT 1`,
      args: [groupId]
    });

    return {
      ...groupResult.rows[0],
      members: membersResult.rows,
      cycle: currentCycle.rows[0] || null
    };
  }
};

module.exports = vslaService;
