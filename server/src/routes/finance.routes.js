const express = require('express');
const { getTransactions, createTransaction, deleteTransaction } = require('../controllers/transaction.controller');
const { getBudgets, upsertBudget } = require('../controllers/budget.controller');
const { getGoals, createGoal, updateGoalProgress, deleteGoal } = require('../controllers/goal.controller');
const { getRentals, createRental, deleteRental } = require('../controllers/rental.controller');
const { getAssets, createAsset, deleteAsset, getLiabilities, createLiability, deleteLiability } = require('../controllers/patrimony.controller');
const { getXitiques, createXitique, deleteXitique, payContribution, receiveFunds } = require('../controllers/xitique.controller');
const { getSettings, upsertSetting, updateHousehold } = require('../controllers/settings.controller');
const { getOverview: getInsights } = require('../controllers/insights.controller');
const { getNotifications, markAsRead, clearAll } = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);

// Transactions
router.get('/transactions', getTransactions);
router.post('/transactions', createTransaction);
router.delete('/transactions/:id', deleteTransaction);

// Budgets
router.get('/budgets', getBudgets);
router.post('/budgets', upsertBudget);

// Goals
router.get('/goals', getGoals);
router.post('/goals', createGoal);
router.put('/goals/:id', updateGoalProgress);
router.delete('/goals/:id', deleteGoal);

// Rentals
router.get('/rentals', getRentals);
router.post('/rentals', createRental);
router.delete('/rentals/:id', deleteRental);

// Patrimony (Assets & Liabilities)
router.get('/assets', getAssets);
router.post('/assets', createAsset);
router.delete('/assets/:id', deleteAsset);
router.get('/liabilities', getLiabilities);
router.post('/liabilities', createLiability);
router.delete('/liabilities/:id', deleteLiability);

// Xitiques
router.get('/xitiques', getXitiques);
router.post('/xitiques', createXitique);
router.post('/xitiques/pay/:contributionId', payContribution);
router.post('/xitiques/receive/:receiptId', receiveFunds);
router.delete('/xitiques/:id', deleteXitique);

// Insights
router.get('/insights', getInsights);

// Notifications
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markAsRead);
router.delete('/notifications', clearAll);

// Settings & Household
router.get('/settings', getSettings);
router.post('/settings', upsertSetting);
router.put('/households', updateHousehold);

module.exports = router;
