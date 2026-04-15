import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../constants/api';

const BACKGROUND_SYNC_TASK = 'BACKGROUND_SYNC_FINANCE_DATA';
const STORAGE_KEY = '@mwanga_finance_data';

// 1. Define the task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const token = await AsyncStorage.getItem('mwanga-token');
    if (!token) return BackgroundFetch.BackgroundFetchResult.NoData;

    // Fetch fresh data
    const [txs, accounts] = await Promise.all([
      api.get('/transactions', { headers: { Authorization: `Bearer ${token}` } }),
      api.get('/accounts', { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const localData = await AsyncStorage.getItem(STORAGE_KEY);
    const state = localData ? JSON.parse(localData) : {};

    const newState = {
      ...state,
      transacoes: txs.data,
      contas: accounts.data,
      lastUpdated: new Date().toISOString()
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    
    console.log('[Background Sync] Data synchronized successfully');
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[Background Sync] Failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 2. Register the task
export async function registerBackgroundSync() {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 60 * 15, // 15 minutes
    stopOnTerminate: false, // android only
    startOnBoot: true, // android only
  });
}

export async function unregisterBackgroundSync() {
  return BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
}
