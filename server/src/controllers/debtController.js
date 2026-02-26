const { db } = require('../config/db');
const logger = require('../utils/logger');

exports.getDebts = (req, res) => {
  try {
    const householdId = req.user.household_id;
    const debts = db.prepare('SELECT * FROM debts WHERE household_id = ? ORDER BY created_at DESC').all(householdId);
    
    // Attach payments to each debt
    for (let d of debts) {
      d.payments = db.prepare('SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY payment_date DESC').all(d.id);
    }
    
    res.json(debts);
  } catch (error) {
    logger.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
};

exports.addDebt = (req, res) => {
  try {
    const { creditor_name, total_amount, due_date } = req.body;
    const householdId = req.user.household_id;
    
    const stmt = db.prepare(`
      INSERT INTO debts (creditor_name, total_amount, remaining_amount, due_date, status, household_id)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `);
    const info = stmt.run(creditor_name, total_amount, total_amount, due_date, householdId);
    
    res.status(201).json({ id: info.lastInsertRowid, message: 'Debt added successfully' });
  } catch (error) {
    logger.error('Error adding debt:', error);
    res.status(500).json({ error: 'Failed to add debt' });
  }
};

exports.deleteDebt = (req, res) => {
  try {
    const { id } = req.params;
    const householdId = req.user.household_id;
    
    db.prepare('DELETE FROM debts WHERE id = ? AND household_id = ?').run(id, householdId);
    res.json({ message: 'Debt deleted' });
  } catch (error) {
    logger.error('Error deleting debt:', error);
    res.status(500).json({ error: 'Failed to delete debt' });
  }
};

exports.addPayment = (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_date } = req.body;
    const householdId = req.user.household_id;

    const debt = db.prepare('SELECT * FROM debts WHERE id = ? AND household_id = ?').get(id, householdId);
    if (!debt) return res.status(404).json({ error: 'Debt not found' });

    db.transaction(() => {
      // Create payment record
      db.prepare(`
        INSERT INTO debt_payments (debt_id, amount, payment_date, household_id)
        VALUES (?, ?, ?, ?)
      `).run(id, amount, payment_date, householdId);

      // Update remaining balance
      const newRemaining = Math.max(0, debt.remaining_amount - amount);
      const newStatus = newRemaining === 0 ? 'paid' : 'pending';

      db.prepare(`
        UPDATE debts 
        SET remaining_amount = ?, status = ?
        WHERE id = ?
      `).run(newRemaining, newStatus, id);
    })();

    res.status(201).json({ message: 'Payment registered successfully' });
  } catch (error) {
    logger.error('Error registering debt payment:', error);
    res.status(500).json({ error: 'Failed to register payment' });
  }
};
