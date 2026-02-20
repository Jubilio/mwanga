const { db } = require('../config/db');
const { z } = require('zod');

const rentalSchema = z.object({
  month: z.string(),
  landlord: z.string(),
  amount: z.number().positive(),
  status: z.enum(['pendente', 'pago']),
  notes: z.string().optional(),
});

const getRentals = async (req, res) => {
  const data = db.prepare('SELECT * FROM rentals WHERE household_id = ? ORDER BY month DESC').all(req.user.householdId);
  res.json(data);
};

const createRental = async (req, res, next) => {
  try {
    const data = rentalSchema.parse(req.body);
    
    const transaction = db.transaction(() => {
      const info = db.prepare('INSERT INTO rentals (month, landlord, amount, status, notes, household_id) VALUES (?, ?, ?, ?, ?, ?)')
                    .run(data.month, data.landlord, data.amount, data.status, data.notes, req.user.householdId);
      
      if (data.status === 'pago') {
        db.prepare(`
          INSERT INTO transactions (date, type, description, amount, category, note, household_id)
          VALUES (?, 'despesa', ?, ?, 'Renda', ?, ?)
        `).run(
          new Date().toISOString().slice(0, 10),
          `Renda: ${data.month} - ${data.landlord}`,
          data.amount,
          data.notes || 'Pagamento registado via módulo Habitação',
          req.user.householdId
        );
      }
      return info.lastInsertRowid;
    });

    const id = transaction();
    res.status(201).json({ id, ...data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteRental = async (req, res) => {
  db.prepare('DELETE FROM rentals WHERE id = ? AND household_id = ?').run(req.params.id, req.user.householdId);
  res.json({ success: true });
};

module.exports = { getRentals, createRental, deleteRental };
