const { db } = require('../config/db');
const { createNotification } = require('./notification.service');

const getXitiques = async (householdId) => {
  const result = await db.execute({
    sql: 'SELECT * FROM xitiques WHERE household_id = ? ORDER BY created_at DESC',
    args: [householdId]
  });
  const list = result.rows;

  if (list.length === 0) return [];

  const ids = list.map(x => x.id);
  const placeholders = ids.map(() => '?').join(',');

  const [cyclesRes, contributionsRes, receiptsRes] = await Promise.all([
    db.execute({ sql: `SELECT * FROM xitique_cycles WHERE xitique_id IN (${placeholders})`, args: ids }),
    db.execute({ sql: `SELECT * FROM xitique_contributions WHERE xitique_id IN (${placeholders})`, args: ids }),
    db.execute({ sql: `SELECT * FROM xitique_receipts WHERE xitique_id IN (${placeholders})`, args: ids }),
  ]);

  const groupBy = (rows, key) => rows.reduce((map, row) => {
    const k = row[key];
    (map[k] = map[k] || []).push(row);
    return map;
  }, {});

  const cyclesMap = groupBy(cyclesRes.rows, 'xitique_id');
  const contribMap = groupBy(contributionsRes.rows, 'xitique_id');
  const receiptsMap = groupBy(receiptsRes.rows, 'xitique_id');

  return list.map(x => ({
    ...x,
    cycles: cyclesMap[x.id] || [],
    contributions: contribMap[x.id] || [],
    receipts: receiptsMap[x.id] || [],
  }));
};

const createXitique = async (householdId, data) => {
  if (data.yourPosition > data.totalParticipants) {
    throw new Error('POSITION_OUT_OF_BOUNDS');
  }

  const xResult = await db.execute({
    sql: 'INSERT INTO xitiques (name, monthly_amount, total_participants, start_date, your_position, household_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
    args: [data.name, data.monthlyAmount, data.totalParticipants, data.startDate, data.yourPosition, householdId]
  });
  const xitiqueId = Number(xResult.rows?.[0]?.id || xResult.lastInsertRowid || 0);

  if (!xitiqueId) throw new Error('CREATE_FAILED');

  for (let i = 1; i <= data.totalParticipants; i++) {
    const date = new Date(data.startDate);
    date.setMonth(date.getMonth() + (i - 1));
    const dueDate = date.toISOString().slice(0, 7);
    
    const cResult = await db.execute({
      sql: 'INSERT INTO xitique_cycles (xitique_id, cycle_number, due_date, receiver_position) VALUES (?, ?, ?, ?) RETURNING id',
      args: [xitiqueId, i, dueDate, i]
    });
    const cycleId = Number(cResult.rows?.[0]?.id || cResult.lastInsertRowid || 0);

    if (!cycleId) throw new Error('CYCLE_CREATE_FAILED');
    
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

  return { id: xitiqueId, ...data };
};

const deleteXitique = async (householdId, xitiqueId) => {
  await db.execute({
    sql: 'DELETE FROM xitiques WHERE id = ? AND household_id = ?',
    args: [xitiqueId, householdId]
  });
  return { success: true };
};

const payContribution = async (householdId, contributionId, paymentData) => {
  const { date, account_id } = paymentData;
  const result = await db.execute({
    sql: `
      SELECT c.*, x.name as xitique_name
      FROM xitique_contributions c 
      JOIN xitiques x ON c.xitique_id = x.id 
      WHERE c.id = ? AND x.household_id = ?
    `,
    args: [contributionId, householdId]
  });
  const contribution = result.rows[0];

  if (!contribution) throw new Error('NOT_FOUND');

  const queries = [
    { sql: 'UPDATE xitique_contributions SET paid = 1, payment_date = ? WHERE id = ?', args: [date, contributionId] },
    {
      sql: `INSERT INTO transactions (date, type, description, amount, category, note, household_id, account_id)
            VALUES (?, 'despesa', ?, ?, 'Xitique', ?, ?, ?)`,
      args: [
        date, 
        `Contribuição Xitique: ${contribution.xitique_name}`, 
        Number(contribution.amount), 
        'Pagamento automático via módulo Xitique', 
        householdId,
        account_id || null
      ]
    }
  ];

  if (account_id) {
    queries.push({
      sql: 'UPDATE accounts SET current_balance = current_balance - ? WHERE id = ? AND household_id = ?',
      args: [Number(contribution.amount), account_id, householdId]
    });
  }

  await db.batch(queries, "write");
  await createNotification(householdId, 'info', `Pagamento de Xitique (${contribution.xitique_name}) realizado com sucesso. ✅`);
  
  return { success: true };
};

const receiveFunds = async (householdId, receiptId, paymentData) => {
  const { date, account_id } = paymentData;
  const result = await db.execute({
    sql: `
      SELECT r.*, x.name as xitique_name
      FROM xitique_receipts r 
      JOIN xitiques x ON r.xitique_id = x.id 
      WHERE r.id = ? AND x.household_id = ?
    `,
    args: [receiptId, householdId]
  });
  const receipt = result.rows[0];

  if (!receipt) throw new Error('NOT_FOUND');

  const queries = [
    { sql: 'UPDATE xitique_receipts SET received_date = ? WHERE id = ?', args: [date, receiptId] },
    {
      sql: `INSERT INTO transactions (date, type, description, amount, category, note, household_id, account_id)
            VALUES (?, 'receita', ?, ?, 'Xitique', ?, ?, ?)`,
      args: [
        date, 
        `Recebimento Xitique: ${receipt.xitique_name}`, 
        Number(receipt.total_received), 
        'Recebimento automático via módulo Xitique', 
        householdId,
        account_id || null
      ]
    }
  ];

  if (account_id) {
    queries.push({
      sql: 'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND household_id = ?',
      args: [Number(receipt.total_received), account_id, householdId]
    });
  }

  await db.batch(queries, "write");
  await createNotification(householdId, 'success', `Recebeste o fundo do Xitique (${receipt.xitique_name})! MT ${receipt.total_received} disponíveis na tua conta. 💰`);
  
  return { success: true };
};

module.exports = {
  getXitiques,
  createXitique,
  deleteXitique,
  payContribution,
  receiveFunds
};
