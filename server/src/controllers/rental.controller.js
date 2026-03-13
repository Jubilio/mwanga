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
  const result = await db.execute({
    sql: 'SELECT * FROM rentals WHERE household_id = ? ORDER BY month DESC',
    args: [req.user.householdId]
  });
  res.json(result.rows);
};

const createRental = async (req, res, next) => {
  try {
    const data = rentalSchema.parse(req.body);
    
    let lastRowId;
    if (data.status === 'pago') {
      const result = await db.batch([
        {
          sql: 'INSERT INTO rentals (month, landlord, amount, status, notes, household_id) VALUES (?, ?, ?, ?, ?, ?)',
          args: [data.month, data.landlord, data.amount, data.status, data.notes, req.user.householdId]
        },
        {
          sql: `
            INSERT INTO transactions (date, type, description, amount, category, note, household_id)
            VALUES (?, 'despesa', ?, ?, 'Renda', ?, ?)
          `,
          args: [
            new Date().toISOString().slice(0, 10),
            `Renda: ${data.month} - ${data.landlord}`,
            data.amount,
            data.notes || 'Pagamento registado via módulo Habitação',
            req.user.householdId
          ]
        }
      ], "write");
      lastRowId = result[0].lastInsertRowid;
    } else {
      const result = await db.execute({
        sql: 'INSERT INTO rentals (month, landlord, amount, status, notes, household_id) VALUES (?, ?, ?, ?, ?, ?)',
        args: [data.month, data.landlord, data.amount, data.status, data.notes, req.user.householdId]
      });
      lastRowId = result.lastInsertRowid;
    }

    res.status(201).json({ id: Number(lastRowId), ...data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteRental = async (req, res) => {
  await db.execute({
    sql: 'DELETE FROM rentals WHERE id = ? AND household_id = ?',
    args: [req.params.id, req.user.householdId]
  });
  res.json({ success: true });
};

module.exports = { getRentals, createRental, deleteRental };
