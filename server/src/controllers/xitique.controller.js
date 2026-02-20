const { db } = require('../config/db');
const { z } = require('zod');

const xitiqueSchema = z.object({
  name: z.string().min(1),
  monthlyAmount: z.number().positive(),
  totalParticipants: z.number().int().min(2),
  startDate: z.string(),
  yourPosition: z.number().int().positive(),
});

const getXitiques = async (req, res) => {
  const list = db.prepare('SELECT * FROM xitiques WHERE household_id = ? ORDER BY created_at DESC').all(req.user.householdId);
  const fullList = list.map(x => {
    const cycles = db.prepare('SELECT * FROM xitique_cycles WHERE xitique_id = ?').all(x.id);
    const contributions = db.prepare('SELECT * FROM xitique_contributions WHERE xitique_id = ?').all(x.id);
    const receipts = db.prepare('SELECT * FROM xitique_receipts WHERE xitique_id = ?').all(x.id);
    return { ...x, cycles, contributions, receipts };
  });
  res.json(fullList);
};

const createXitique = async (req, res, next) => {
  try {
    const data = xitiqueSchema.parse(req.body);
    
    if (data.yourPosition > data.totalParticipants) {
      return res.status(400).json({ error: 'Sua posição não pode ser maior que o total de participantes' });
    }

    const transaction = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO xitiques (name, monthly_amount, total_participants, start_date, your_position, household_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(data.name, data.monthlyAmount, data.totalParticipants, data.startDate, data.yourPosition, req.user.householdId);
      
      const xitiqueId = info.lastInsertRowid;
      
      // Generate Cycles
      for (let i = 1; i <= data.totalParticipants; i++) {
        const date = new Date(data.startDate);
        date.setMonth(date.getMonth() + (i - 1));
        const dueDate = date.toISOString().slice(0, 7);
        
        const cycleInfo = db.prepare(`
          INSERT INTO xitique_cycles (xitique_id, cycle_number, due_date, receiver_position)
          VALUES (?, ?, ?, ?)
        `).run(xitiqueId, i, dueDate, i);
        
        const cycleId = cycleInfo.lastInsertRowid;
        
        db.prepare(`
          INSERT INTO xitique_contributions (xitique_id, cycle_id, amount, paid)
          VALUES (?, ?, ?, 0)
        `).run(xitiqueId, cycleId, data.monthlyAmount);

        if (i === data.yourPosition) {
          db.prepare(`
            INSERT INTO xitique_receipts (xitique_id, cycle_id, total_received)
            VALUES (?, ?, ?)
          `).run(xitiqueId, cycleId, data.monthlyAmount * data.totalParticipants);
        }
      }
      return xitiqueId;
    });

    const id = transaction();
    res.status(201).json({ id, ...data });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: error.errors });
    next(error);
  }
};

const deleteXitique = async (req, res) => {
  db.prepare('DELETE FROM xitiques WHERE id = ? AND household_id = ?').run(req.params.id, req.user.householdId);
  res.json({ success: true });
};

const payContribution = async (req, res, next) => {
  const { date } = req.body;
  const { contributionId } = req.params;

  try {
    const contribution = db.prepare(`
      SELECT c.*, x.name as xitique_name
      FROM xitique_contributions c 
      JOIN xitiques x ON c.xitique_id = x.id 
      WHERE c.id = ? AND x.household_id = ?
    `).get(contributionId, req.user.householdId);

    if (!contribution) return res.status(403).json({ error: 'Access denied or contribution not found' });

    db.transaction(() => {
      db.prepare('UPDATE xitique_contributions SET paid = 1, payment_date = ? WHERE id = ?')
        .run(date, contributionId);
      
      db.prepare(`
        INSERT INTO transactions (date, type, description, amount, category, note, household_id)
        VALUES (?, 'despesa', ?, ?, 'Xitique', ?, ?)
      `).run(date, `Contribuição Xitique: ${contribution.xitique_name}`, contribution.amount, 'Pagamento automático via módulo Xitique', req.user.householdId);
    })();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const receiveFunds = async (req, res, next) => {
  const { date } = req.body;
  const { receiptId } = req.params;

  try {
    const receipt = db.prepare(`
      SELECT r.*, x.name as xitique_name
      FROM xitique_receipts r 
      JOIN xitiques x ON r.xitique_id = x.id 
      WHERE r.id = ? AND x.household_id = ?
    `).get(receiptId, req.user.householdId);

    if (!receipt) return res.status(403).json({ error: 'Access denied or receipt not found' });

    db.transaction(() => {
      db.prepare('UPDATE xitique_receipts SET received_date = ? WHERE id = ?')
        .run(date, receiptId);
      
      db.prepare(`
        INSERT INTO transactions (date, type, description, amount, category, note, household_id)
        VALUES (?, 'receita', ?, ?, 'Xitique', ?, ?)
      `).run(date, `Recebimento Xitique: ${receipt.xitique_name}`, receipt.total_received, 'Recebimento automático via módulo Xitique', req.user.householdId);
    })();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { getXitiques, createXitique, deleteXitique, payContribution, receiveFunds };
