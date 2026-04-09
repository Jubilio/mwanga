const { db } = require('../config/db');
const logger = require('../utils/logger');

const initHouseholdExtras = async () => {
    try {
        logger.info('Verifying households table structure...');
        // Add cash_balance if it doesn't exist
        await db.execute(`
            ALTER TABLE households 
            ADD COLUMN IF NOT EXISTS cash_balance DECIMAL(15, 2) DEFAULT 0
        `);
        logger.info('Households table structure verified.');
    } catch (error) {
        logger.error('Error initializing household extras:', error.message);
    }
};

const updateCashBalance = async (householdId, amount) => {
    try {
        await db.execute({
            sql: 'UPDATE households SET cash_balance = cash_balance + ? WHERE id = ?',
            args: [amount, householdId]
        });
        return true;
    } catch (error) {
        logger.error('Error updating cash balance:', error.message);
        throw error;
    }
};

const getCashBalance = async (householdId) => {
    try {
        const result = await db.execute({
            sql: 'SELECT cash_balance FROM households WHERE id = ?',
            args: [householdId]
        });
        return Number(result.rows[0]?.cash_balance || 0);
    } catch (error) {
        logger.error('Error getting cash balance:', error.message);
        return 0;
    }
};

module.exports = {
    initHouseholdExtras,
    updateCashBalance,
    getCashBalance
};
