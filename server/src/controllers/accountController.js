const { db } = require('../config/db');
const logger = require('../utils/logger');

exports.getAccounts = (req, res) => {
  try {
    const householdId = req.user.household_id;
    const accounts = db.prepare('SELECT * FROM accounts WHERE household_id = ? ORDER BY created_at DESC').all(householdId);
    res.json(accounts);
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
};

exports.addAccount = (req, res) => {
  try {
    const { name, type, initial_balance } = req.body;
    const householdId = req.user.household_id;
    
    // We set current_balance equal to initial_balance on creation
    const stmt = db.prepare(`
      INSERT INTO accounts (name, type, initial_balance, current_balance, household_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, type, initial_balance, initial_balance, householdId);
    
    res.status(201).json({ id: info.lastInsertRowid, message: 'Account added successfully' });
  } catch (error) {
    logger.error('Error adding account:', error);
    res.status(500).json({ error: 'Failed to add account' });
  }
};

exports.updateAccountBalance = (req, res) => {
  try {
    const { id } = req.params;
    const { current_balance } = req.body;
    const householdId = req.user.household_id;

    db.prepare(`
      UPDATE accounts 
      SET current_balance = ? 
      WHERE id = ? AND household_id = ?
    `).run(current_balance, id, householdId);

    res.json({ message: 'Account balance updated' });
  } catch (error) {
    logger.error('Error updating account balance:', error);
    res.status(500).json({ error: 'Failed to update balance' });
  }
};

exports.deleteAccount = (req, res) => {
  try {
    const { id } = req.params;
    const householdId = req.user.household_id;
    
    db.prepare('DELETE FROM accounts WHERE id = ? AND household_id = ?').run(id, householdId);
    res.json({ message: 'Account deleted' });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};
