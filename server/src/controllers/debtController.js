const { db } = require('../config/db');
const logger = require('../utils/logger');

exports.getDebts = async (req, res) => {
  try {
    const householdId = req.user.householdId;
    const result = await db.execute({
      sql: 'SELECT * FROM debts WHERE household_id = ? ORDER BY created_at DESC',
      args: [householdId]
    });
    const debts = result.rows;
    
    // Attach payments to each debt in parallel
    await Promise.all(debts.map(async (d) => {
      const pResult = await db.execute({
        sql: 'SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY payment_date DESC',
        args: [d.id]
      });
      d.payments = pResult.rows;
    }));
    
    res.json(debts);
  } catch (error) {
    logger.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
};

exports.addDebt = async (req, res) => {
  try {
    const { creditor_name, total_amount, due_date } = req.body;
    const householdId = req.user.householdId;
    
    const result = await db.execute({
      sql: `
        INSERT INTO debts (creditor_name, total_amount, remaining_amount, due_date, status, household_id)
        VALUES (?, ?, ?, ?, 'pending', ?) RETURNING id
      `,
      args: [creditor_name, total_amount, total_amount, due_date, householdId]
    });
    
    res.status(201).json({ id: Number(result.lastInsertRowid), message: 'Dívida adicionada com sucesso' });
  } catch (error) {
    logger.error('Error adding debt:', error);
    res.status(500).json({ error: 'Failed to add debt' });
  }
};

exports.deleteDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const householdId = req.user.householdId;
    
    await db.execute({
      sql: 'DELETE FROM debts WHERE id = ? AND household_id = ?',
      args: [id, householdId]
    });
    res.json({ message: 'Dívida eliminada' });
  } catch (error) {
    logger.error('Error deleting debt:', error);
    res.status(500).json({ error: 'Failed to delete debt' });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_date } = req.body;
    const householdId = req.user.householdId;

    const result = await db.execute({
      sql: 'SELECT * FROM debts WHERE id = ? AND household_id = ?',
      args: [id, householdId]
    });
    const debt = result.rows[0];
    if (!debt) return res.status(404).json({ error: 'Dívida não encontrada' });

    const newRemaining = Math.max(0, debt.remaining_amount - amount);
    const newStatus = newRemaining === 0 ? 'paid' : 'pending';

    await db.batch([
      {
        sql: 'INSERT INTO debt_payments (debt_id, amount, payment_date, household_id) VALUES (?, ?, ?, ?) RETURNING id',
        args: [id, amount, payment_date, householdId]
      },
      {
        sql: 'UPDATE debts SET remaining_amount = ?, status = ? WHERE id = ?',
        args: [newRemaining, newStatus, id]
      }
    ], "write");

    res.status(201).json({ message: 'Pagamento registado com sucesso' });
  } catch (error) {
    logger.error('Error registering debt payment:', error);
    res.status(500).json({ error: 'Failed to register payment' });
  }
};
