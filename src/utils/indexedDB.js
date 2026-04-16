import { openDB } from 'idb';

const DB_NAME = 'MwangaDB';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pendingTransactions')) {
        db.createObjectStore('pendingTransactions', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('dashboardCache')) {
        db.createObjectStore('dashboardCache');
      }
      if (!db.objectStoreNames.contains('financialData')) {
        db.createObjectStore('financialData');
      }
    },
  });
};

export const savePendingTransaction = async (tx) => {
  const db = await initDB();
  return db.add('pendingTransactions', { ...tx, timestamp: Date.now() });
};

export const getPendingTransactions = async () => {
  const db = await initDB();
  return db.getAll('pendingTransactions');
};

export const clearPendingTransaction = async (id) => {
  const db = await initDB();
  return db.delete('pendingTransactions', id);
};

export const cacheDashboardData = async (data) => {
  const db = await initDB();
  return db.put('dashboardCache', data, 'latest');
};

export const getCachedDashboardData = async () => {
  const db = await initDB();
  return db.get('dashboardCache', 'latest');
};
