const { db } = require('../config/db');
const { z } = require('zod');
const { createNotification } = require('../services/notification.service');

const xitiqueSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  monthlyAmount: z.number().positive(),
  totalParticipants: z.number().int().min(2).max(50),
  startDate: z.string().min(10).max(10), // YYYY-MM-DD
  yourPosition: z.number().int().positive(),
}).strict();

const xitiquePaymentSchema = z.object({
  date: z.string().min(10).max(10),
  account_id: z.coerce.number().optional(),
}).strict();

const getXitiques = async (req, res) => {
  const result = await db.execute({
    sql: 'SELECT * FROM xitiques WHERE household_id = ? ORDER BY created_at DESC',
    args: [req.user.householdId]
  });
  const list = result.rows;

  const fullList = await Promise.all(list.map(async (x) => {
    const cyclesRes = await db.execute({
      sql: 'SELECT * FROM xitique_cycles WHERE xitique_id = ?',
      args: [x.id]
    });
    const contributionsRes = await db.execute({
      sql: 'SELECT * FROM xitique_contributions WHERE xitique_id = ?',
      args: [x.id]
    });
    const receiptsRes = await db.execute({
      sql: 'SELECT * FROM xitique_receipts WHERE xitique_id = ?',
      args: [x.id]
    });
    return { ...x, cycles: cyclesRes.rows, contributions: contributionsRes.rows, receipts: receiptsRes.rows };
  }));
  res.json(fullList);
};

const createXitique = async (req, res, next) => {
  try {
    const data = xitiqueSchema.parse(req.body);
    
    if (data.yourPosition > data.totalParticipants) {
      return res.status(400).json({ error: 'Sua posição não pode ser maior que o total de participantes' });
    }

    const xResult = await db.execute({
      sql: 'INSERT INTO xitiques (name, monthly_amount, total_participants, start_date, your_position, household_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
      args: [data.name, data.monthlyAmount, data.totalParticipants, data.startDate, data.yourPosition, req.user.householdId]
    });
    const xitiqueId = Number(xResult.rows?.[0]?.id || xResult.lastInsertRowid || 0);

    if (!xitiqueId) {
      return res.status(500).json({ error: 'Falha ao criar o grupo de xitique' });
    }

    // Sequential creation for reliable lastInsertRowid
    for (let i = 1; i <= data.totalParticipants; i++) {
        const date = new Date(data.startDate);
        date.setMonth(date.getMonth() + (i - 1));
        const dueDate = date.toISOString().slice(0, 7);
        
        const cResult = await db.execute({
          sql: 'INSERT INTO xitique_cycles (xitique_id, cycle_number, due_date, receiver_position) VALUES (?, ?, ?, ?) RETURNING id',
          args: [xitiqueId, i, dueDate, i]
        });
        const cycleId = Number(cResult.rows?.[0]?.id || cResult.lastInsertRowid || 0);

        if (!cycleId) {
          return res.status(500).json({ error: 'Falha ao gerar os ciclos do xitique' });
        }
        
        await db.execute({
          sql: 'INSERT INTO xitique_contributions (xitique_id, cycle_id, amount, paid) VALUES (?, ?, ?, 0)',
          args: [xitiqueId, cycleId, data.monthlyAmount]
        });

        if (i === data.yourPosition) {
          await db.execute({
            sql: 'INSERT INTO xitique_receipts (xitique_id, cycle_id, total_received) VALUES (?, ?, ?)',
            args: [xitiqueId, cycleId, data.monthlyAmount * data.totalParticipants]
          });
        }
    }

    res.status(201).json({ id: xitiqueId, ...data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteXitique = async (req, res) => {
  await db.execute({
    sql: 'DELETE FROM xitiques WHERE id = ? AND household_id = ?',
    args: [req.params.id, req.user.householdId]
  });
  res.json({ success: true });
};

const payContribution = async (req, res, next) => {
  try {
    const { date, account_id } = xitiquePaymentSchema.parse(req.body);
    const { contributionId } = req.params;
    const result = await db.execute({
      sql: `
        SELECT c.*, x.name as xitique_name
        FROM xitique_contributions c 
        JOIN xitiques x ON c.xitique_id = x.id 
        WHERE c.id = ? AND x.household_id = ?
      `,
      args: [contributionId, req.user.householdId]
    });
    const contribution = result.rows[0];

    if (!contribution) return res.status(403).json({ error: 'Acesso negado ou contribuição não encontrada' });

    const queries = [
      {
        sql: 'UPDATE xitique_contributions SET paid = 1, payment_date = ? WHERE id = ?',
        args: [date, contributionId]
      },
      {
        sql: `
          INSERT INTO transactions (date, type, description, amount, category, note, household_id, account_id)
          VALUES (?, 'despesa', ?, ?, 'Xitique', ?, ?, ?) RETURNING id
        `,
        args: [
          date, 
          `Contribuição Xitique: ${contribution.xitique_name}`, 
          Number(contribution.amount), 
          'Pagamento automático via módulo Xitique', 
          req.user.householdId,
          account_id || null
        ]
      }
    ];

    if (account_id) {
      queries.push({
        sql: 'UPDATE accounts SET current_balance = current_balance - ? WHERE id = ? AND household_id = ?',
        args: [Number(contribution.amount), account_id, req.user.householdId]
      });
    }

    await db.batch(queries, "write");

    await createNotification(
      req.user.householdId, 
      'info', 
      `Pagamento de Xitique (${contribution.xitique_name}) realizado com sucesso. ✅`
    );

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const receiveFunds = async (req, res, next) => {
  try {
    const { date, account_id } = xitiquePaymentSchema.parse(req.body);
    const { receiptId } = req.params;
    const result = await db.execute({
      sql: `
        SELECT r.*, x.name as xitique_name
        FROM xitique_receipts r 
        JOIN xitiques x ON r.xitique_id = x.id 
        WHERE r.id = ? AND x.household_id = ?
      `,
      args: [receiptId, req.user.householdId]
    });
    const receipt = result.rows[0];

    if (!receipt) return res.status(403).json({ error: 'Acesso negado ou recebimento não encontrado' });

    const queries = [
      {
        sql: 'UPDATE xitique_receipts SET received_date = ? WHERE id = ?',
        args: [date, receiptId]
      },
      {
        sql: `
          INSERT INTO transactions (date, type, description, amount, category, note, household_id, account_id)
          VALUES (?, 'receita', ?, ?, 'Xitique', ?, ?, ?) RETURNING id
        `,
        args: [
          date, 
          `Recebimento Xitique: ${receipt.xitique_name}`, 
          Number(receipt.total_received), 
          'Recebimento automático via módulo Xitique', 
          req.user.householdId,
          account_id || null
        ]
      }
    ];

    if (account_id) {
      queries.push({
        sql: 'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND household_id = ?',
        args: [Number(receipt.total_received), account_id, req.user.householdId]
      });
    }

    await db.batch(queries, "write");

    await createNotification(
      req.user.householdId, 
      'success', 
      `Recebeste o fundo do Xitique (${receipt.xitique_name})! MT ${receipt.total_received} disponíveis na tua conta. 💰`
    );

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

module.exports = { getXitiques, createXitique, deleteXitique, payContribution, receiveFunds };
