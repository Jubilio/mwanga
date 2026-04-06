const express = require('express');
const { getTransactions, createTransaction, deleteTransaction } = require('../controllers/transaction.controller');
const { getBudgets, upsertBudget, deleteBudget } = require('../controllers/budget.controller');
const { getGoals, createGoal, updateGoalProgress, deleteGoal } = require('../controllers/goal.controller');
const { getRentals, createRental, deleteRental } = require('../controllers/rental.controller');
const { getAssets, createAsset, deleteAsset, getLiabilities, createLiability, deleteLiability } = require('../controllers/patrimony.controller');
const { getXitiques, createXitique, deleteXitique, payContribution, receiveFunds } = require('../controllers/xitique.controller');
const { getSettings, upsertSetting, updateHousehold } = require('../controllers/settings.controller');
const { getOverview: getInsights } = require('../controllers/insights.controller');
const {
  list: getNotifications,
  markRead: markAsRead,
  clearAll,
  deleteOne: deleteNotification,
  getPushConfig: getPushPublicKey,
  subscribe: savePushSubscription,
  unsubscribe: removePushSubscription,
  recordInteraction: registerInteraction,
  sendTest: sendTestPush,
} = require('../controllers/notification.controller');
const { getDebts, addDebt, deleteDebt, addPayment } = require('../controllers/debtController');
const { getAccounts, addAccount, updateAccountBalance, deleteAccount } = require('../controllers/accountController');
const { chat: binthChat, getScore: binthScore, getPageInsight } = require('../controllers/binth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const vslaRoutes = require('./vsla.routes');

const router = express.Router();

router.use(authenticate);

// VSLA (Community)
router.use('/vsla', vslaRoutes);

// Transactions
router.get('/transactions', getTransactions);
router.post('/transactions', createTransaction);
router.delete('/transactions/:id', deleteTransaction);

// Budgets
router.get('/budgets', getBudgets);
router.post('/budgets', upsertBudget);
router.delete('/budgets/:id', deleteBudget);

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
router.get('/notifications/push-config', getPushPublicKey);
router.post('/notifications/push-subscriptions', savePushSubscription);
router.delete('/notifications/push-subscriptions', removePushSubscription);
router.post('/notifications/interactions', registerInteraction);
router.post('/notifications/test', sendTestPush);
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markAsRead);
router.delete('/notifications/:id', deleteNotification);
router.delete('/notifications', clearAll);

// Settings & Household
router.get('/settings', getSettings);
router.post('/settings', upsertSetting);
router.put('/households', updateHousehold);

// Debts
router.get('/debts', getDebts);
router.post('/debts', addDebt);
router.delete('/debts/:id', deleteDebt);
router.post('/debts/:id/pay', addPayment);

// Accounts
router.get('/accounts', getAccounts);
router.post('/accounts', addAccount);
router.put('/accounts/:id/balance', updateAccountBalance);
router.delete('/accounts/:id', deleteAccount);

// Binth AI
router.post('/binth/chat', binthChat);
router.get('/binth/score', binthScore);
router.get('/binth/insights/:page', getPageInsight);

module.exports = router;
