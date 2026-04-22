const { db } = require('../config/db');

const getAssets = async (householdId) => {
  const result = await db.execute({
    sql: 'SELECT * FROM assets WHERE household_id = ?',
    args: [householdId]
  });
  return result.rows;
};

const createAsset = async (householdId, data) => {
  const result = await db.execute({
    sql: 'INSERT INTO assets (name, type, value, household_id) VALUES (?, ?, ?, ?) RETURNING id',
    args: [data.name, data.type, data.value, householdId]
  });
  return { id: Number(result.rows?.[0]?.id || result.lastInsertRowid || 0), ...data };
};

const deleteAsset = async (householdId, assetId) => {
  await db.execute({
    sql: 'DELETE FROM assets WHERE id = ? AND household_id = ?',
    args: [assetId, householdId]
  });
  return { success: true };
};

const getLiabilities = async (householdId) => {
  const result = await db.execute({
    sql: 'SELECT * FROM liabilities WHERE household_id = ?',
    args: [householdId]
  });
  return result.rows;
};

const createLiability = async (householdId, data) => {
  const result = await db.execute({
    sql: 'INSERT INTO liabilities (name, total_amount, remaining_amount, interest_rate, household_id) VALUES (?, ?, ?, ?, ?) RETURNING id',
    args: [data.name, data.totalAmount, data.remainingAmount, data.interestRate, householdId]
  });
  return { id: Number(result.rows?.[0]?.id || result.lastInsertRowid || 0), ...data };
};

const deleteLiability = async (householdId, liabilityId) => {
  await db.execute({
    sql: 'DELETE FROM liabilities WHERE id = ? AND household_id = ?',
    args: [liabilityId, householdId]
  });
  return { success: true };
};

module.exports = {
  getAssets,
  createAsset,
  deleteAsset,
  getLiabilities,
  createLiability,
  deleteLiability
};
