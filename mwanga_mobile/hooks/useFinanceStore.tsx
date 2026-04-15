import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../constants/api';

const FinanceContext = createContext(null);

const initialState = {
  transacoes: [],
  contas: [],
  settings: {},
  user: null,
  loading: true,
  lastUpdated: null,
};

const STORAGE_KEY = '@mwanga_finance_data';

function reducer(state, action) {
  let newState;
  switch (action.type) {
    case 'SET_DATA':
      newState = { ...state, ...action.payload, loading: false, lastUpdated: new Date().toISOString() };
      break;
    case 'SET_USER':
      newState = { ...state, user: action.payload };
      break;
    case 'LOGOUT':
      newState = { ...initialState, loading: false };
      break;
    case 'ADD_TRANSACTION':
      newState = { ...state, transacoes: [action.payload, ...state.transacoes] };
      break;
    default:
      newState = state;
  }
  
  // Persist to local storage if not just a reset/loading state
  if (action.type !== 'LOGOUT' && action.type !== 'SET_DATA_LOADING') {
     AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState)).catch(e => console.error('Failed to persist state', e));
  }
  
  return newState;
}

export function FinanceProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    async function init() {
      // 1. Try to load local data first for instant load
      try {
        const localData = await AsyncStorage.getItem(STORAGE_KEY);
        if (localData) {
          dispatch({ type: 'SET_DATA', payload: { ...JSON.parse(localData), loading: true } });
        }
      } catch (err) {
        console.warn('Failed to load local data');
      }

      // 2. Fetch from API to update
      const token = await AsyncStorage.getItem('mwanga-token');
      if (!token) {
        dispatch({ type: 'SET_DATA', payload: { loading: false } });
        return;
      }

      try {
        const [txs, accounts, me] = await Promise.all([
          api.get('/transactions'),
          api.get('/accounts'),
          api.get('/auth/me'),
        ]);

        dispatch({
          type: 'SET_DATA',
          payload: {
            transacoes: txs.data,
            contas: accounts.data,
            user: me.data,
          }
        });
      } catch (err) {
        console.error('Fetch error (offline?):', err);
        dispatch({ type: 'SET_DATA', payload: { loading: false } });
      }
    }
    init();
  }, []);

  return (
    <FinanceContext.Provider value={{ state, dispatch }}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);
