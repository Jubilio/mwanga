const { z } = require('zod');
const { db } = require('../config/db');

const rentalSchema = z.object({
  month: z.string().min(7).max(7).trim(),
  landlord: z.string().min(2).max(100).trim(),
  amount: z.number().positive(),
  status: z.enum(['pendente', 'pago']),
  notes: z.string().max(500).trim().optional()
}).strict();

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

    const rentalResult = await db.execute({
      sql: 'INSERT INTO rentals (month, landlord, amount, status, notes, household_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      args: [data.month, data.landlord, data.amount, data.status, data.notes, req.user.householdId]
    });

    const rentalId = Number(rentalResult.rows?.[0]?.id ?? rentalResult.lastInsertRowid);

    if (data.status === 'pago') {
      const transactionNote = data.notes
        ? `${data.notes} [rental:${rentalId}]`
        : `Pagamento registado via módulo Habitação [rental:${rentalId}]`;

      await db.execute({
        sql: `
          INSERT INTO transactions (date, type, description, amount, category, note, household_id)
          VALUES (?, 'despesa', ?, ?, 'Renda', ?, ?)
        `,
        args: [
          `${data.month}-01`,
          `Renda: ${data.month} - ${data.landlord}`,
          data.amount,
          transactionNote,
          req.user.householdId
        ]
      });
    }

    res.status(201).json({ id: rentalId, ...data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    next(error);
  }
};

const deleteRental = async (req, res, next) => {
  try {
    const rentalResult = await db.execute({
      sql: 'SELECT * FROM rentals WHERE id = ? AND household_id = ?',
      args: [req.params.id, req.user.householdId]
    });

    const rental = rentalResult.rows?.[0];
    if (!rental) return res.status(404).json({ error: 'Rental not found' });

    await db.execute({
      sql: 'DELETE FROM rentals WHERE id = ? AND household_id = ?',
      args: [req.params.id, req.user.householdId]
    });

    if (rental.status === 'pago') {
      const taggedTransaction = await db.execute({
        sql: `
          SELECT id FROM transactions
          WHERE household_id = ?
            AND note LIKE ?
          ORDER BY id DESC
          LIMIT 1
        `,
        args: [req.user.householdId, `%[rental:${rental.id}]%`]
      });

      let transactionId = taggedTransaction.rows?.[0]?.id;

      if (!transactionId) {
        const legacyTransaction = await db.execute({
          sql: `
            SELECT id FROM transactions
            WHERE household_id = ?
              AND amount = ?
              AND substr(date, 1, 7) = ?
              AND (
                (type = 'despesa' AND category = 'Renda' AND description = ?)
                OR
                (type = 'renda' AND category = 'Habitação' AND description IN (?, ?, ?))
              )
            ORDER BY id DESC
            LIMIT 1
          `,
          args: [
            req.user.householdId,
            rental.amount,
            rental.month,
            `Renda: ${rental.month} - ${rental.landlord}`,
            `Aluguer: ${rental.landlord}`,
            `Prestação: ${rental.landlord}`,
            `Prestacao: ${rental.landlord}`
          ]
        });

        transactionId = legacyTransaction.rows?.[0]?.id;
      }

      if (transactionId) {
        await db.execute({
          sql: 'DELETE FROM transactions WHERE id = ? AND household_id = ?',
          args: [transactionId, req.user.householdId]
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRentals, createRental, deleteRental };
