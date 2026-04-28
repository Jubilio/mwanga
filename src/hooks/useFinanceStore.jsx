import { useReducer, useEffect, useCallback } from 'react';
import { FinanceContext } from './FinanceContext';
import { generateDemoData } from '../utils/calculations';
import { db } from '../db/db';
import { normalizeCategory } from '../utils/categories';
import { useOfflineSync } from './useOfflineSync';

import { 
  FINANCE_API_URL, 
  DEFAULT_SETTINGS,
  normalizeSettings,
  mapTransaction, 
  mapRental, 
  mapGoal, 
  mapAccount, 
  mapXitique, 
  fetchAllData,
  apiCall
} from '../services/finance.service';

const defaultState = {
  transacoes: [],
  rendas: [],
  metas: [],
  budgets: [],
  activos: [],
  passivos: [],
  xitiques: [],
  dividas: [],
  contas: [],
  loanApplications: [],
  loans: [],
  settings: DEFAULT_SETTINGS,
  user: null,
  darkMode: true,
  loading: true,
};

function createInitialState(darkMode) {
  return { ...defaultState, darkMode };
}

let fetchPromise = null;

async function fetchSessionData(dispatch, { preferredUser = null } = {}) {
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const token = localStorage.getItem('mwanga-token');
    if (!token) {
      dispatch({ type: 'RESET_SESSION' });
      fetchPromise = null;
      return null;
    }

    const headers = { Authorization: `Bearer ${token}` };

    try {
      const fetched = await fetchAllData(headers, dispatch);
      if (fetched === null) {
        fetchPromise = null;
        return null;
      }

      const { ts, rendas, metas, budgets, assets, liabs, xitiques, settingsResp, user, debts, accounts, loanApplications, loans } = fetched;
      const mergedSettings = normalizeSettings(settingsResp && !Array.isArray(settingsResp) ? settingsResp : {});
      const resolvedUser = preferredUser || user || null;

      dispatch({
        type: 'SET_DATA',
        payload: {
          transacoes: Array.isArray(ts) ? ts.map(mapTransaction) : [],
          rendas: Array.isArray(rendas) ? rendas.map(mapRental) : [],
          metas: Array.isArray(metas) ? metas.map(mapGoal) : [],
          budgets: Array.isArray(budgets) ? budgets.map(b => ({ id: b.id, category: b.category, limit: Number(b.limit_amount || 0) })) : [],
          activos: Array.isArray(assets) ? assets.map(a => ({ id: a.id, name: a.name, type: a.type, value: Number(a.value || 0) })) : [],
          passivos: Array.isArray(liabs) ? liabs.map(l => ({
            id: l.id,
            name: l.name,
            total: Number(l.total_amount || 0),
            restante: Number(l.remaining_amount || 0),
            interestRate: Number(l.interest_rate || 0)
          })) : [],
          xitiques: Array.isArray(xitiques) ? xitiques.map(mapXitique) : [],
          dividas: Array.isArray(debts) ? debts.map(d => ({
            ...d,
            total_amount: Number(d.total_amount || 0),
            remaining_amount: Number(d.remaining_amount || 0),
            payments: d.payments?.map(p => ({ ...p, amount: Number(p.amount || 0) })) || []
          })) : [],
          contas: Array.isArray(accounts) ? accounts.map(mapAccount) : [],
          loanApplications: Array.isArray(loanApplications) ? loanApplications : [],
          loans: Array.isArray(loans) ? loans : [],
          settings: mergedSettings,
          user: resolvedUser
        }
      });

      await Promise.all([
        db.transacoes.clear().then(() => db.transacoes.bulkPut(Array.isArray(ts) ? ts.map(mapTransaction) : [])),
        db.budgets.clear().then(() => db.budgets.bulkPut(Array.isArray(budgets) ? budgets.map(b => ({ id: b.id, category: b.category, limit: Number(b.limit_amount || 0) })) : [])),
        db.metas.clear().then(() => db.metas.bulkPut(Array.isArray(metas) ? metas.map(mapGoal) : [])),
        db.rendas.clear().then(() => db.rendas.bulkPut(Array.isArray(rendas) ? rendas.map(mapRental) : [])),
        db.settings.put({ id: 'current', ...mergedSettings }),
        resolvedUser ? db.settings.put({ id: 'user_profile', ...resolvedUser }) : Promise.resolve()
      ]);

      fetchPromise = null;
      return resolvedUser;
    } catch (err) {
      console.error('Session load failed, using demo data.', err);
      const demo = generateDemoData();
      dispatch({ type: 'SET_DATA', payload: { ...demo, user: preferredUser || null } });
      fetchPromise = null;
      return preferredUser || null;
    }
  })();

  return fetchPromise;
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATA': return { ...state, ...action.payload, loading: false };
    case 'RESET_SESSION': return { ...createInitialState(state.darkMode), loading: false };
    case 'SET_USER': return { ...state, user: action.payload };
    case 'ADD_TRANSACTION': return { ...state, transacoes: [action.payload, ...state.transacoes] };
    case 'DELETE_TRANSACTION': return { ...state, transacoes: state.transacoes.filter(t => t.id !== action.payload) };
    case 'ADD_RENDA': return { ...state, rendas: [action.payload, ...state.rendas] };
    case 'DELETE_RENDA': return { ...state, rendas: state.rendas.filter(r => r.id !== action.payload) };
    case 'ADD_META': return { ...state, metas: [...state.metas, action.payload] };
    case 'UPDATE_META': return { ...state, metas: state.metas.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) };
    case 'DELETE_META': return { ...state, metas: state.metas.filter(m => m.id !== action.payload) };
    case 'SET_BUDGET': {
      const idx = state.budgets.findIndex(b => b.category === action.payload.category);
      if (idx >= 0) {
        const up = [...state.budgets];
        up[idx] = { ...up[idx], ...action.payload };
        return { ...state, budgets: up };
      }
      return { ...state, budgets: [...state.budgets, action.payload] };
    }
    case 'DELETE_BUDGET': return { ...state, budgets: state.budgets.filter(b => b.id !== action.payload && b.category !== action.meta?.category) };
    case 'UPDATE_SETTING': return { ...state, settings: { ...state.settings, [action.payload.key]: action.payload.value } };
    case 'UPDATE_USER': return { ...state, user: { ...state.user, ...action.payload } };
    case 'ADD_ASSET': return { ...state, activos: [...state.activos, action.payload] };
    case 'DELETE_ASSET': return { ...state, activos: state.activos.filter(a => a.id !== action.payload) };
    case 'ADD_LIABILITY': return { ...state, passivos: [...state.passivos, action.payload] };
    case 'DELETE_LIABILITY': return { ...state, passivos: state.passivos.filter(p => p.id !== action.payload) };
    case 'SET_XITIQUES': return { ...state, xitiques: action.payload };
    case 'ADD_DEBT': return { ...state, dividas: [action.payload, ...state.dividas] };
    case 'DELETE_DEBT': return { ...state, dividas: state.dividas.filter(d => d.id !== action.payload) };
    case 'SET_DEBTS': return { ...state, dividas: action.payload };
    case 'ADD_ACCOUNT': return { ...state, contas: [action.payload, ...state.contas] };
    case 'UPDATE_ACCOUNT_BALANCE': return { ...state, contas: state.contas.map(c => c.id === action.payload.id ? { ...c, current_balance: action.payload.balance } : c) };
    case 'DELETE_ACCOUNT': return { ...state, contas: state.contas.filter(c => c.id !== action.payload) };
    case 'SET_ACCOUNTS':
    case 'SET_CONTAS': return { ...state, contas: action.payload };
    case 'TOGGLE_DARK_MODE': return { ...state, darkMode: !state.darkMode };
    default: return state;
  }
}

export function FinanceProvider({ children }) {
  const storedDarkMode = localStorage.getItem('mwanga-dark');
  const [state, dispatch] = useReducer(reducer, createInitialState(storedDarkMode === null ? true : storedDarkMode === 'true'));

  useEffect(() => {
    fetchSessionData(dispatch);
  }, []);

  useEffect(() => {
    localStorage.setItem('mwanga-dark', state.darkMode);
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  const apiDispatch = async (action) => {
    const { payload, type } = action;
    switch (type) {
      case 'ADD_TRANSACTION': {
        const body = { date: payload.data, type: payload.tipo, description: payload.desc, amount: payload.valor, category: normalizeCategory(payload.cat), note: payload.nota, account_id: payload.account_id };
        try {
          await apiCall('transactions', 'POST', body);
          const [t, a] = await Promise.all([apiCall('transactions'), apiCall('accounts')]);
          dispatch({ type: 'SET_DATA', payload: { transacoes: t.map(mapTransaction), contas: a.map(mapAccount) } });
        } catch {
          await db.transacoes.add(mapTransaction({ ...body, id: `offline-${Date.now()}` }));
          await db.pendingActions.add({ type, payload: body, timestamp: Date.now() });
          dispatch({ type, payload });
        }
        return;
      }
      case 'DELETE_TRANSACTION': {
        try {
          await apiCall(`transactions/${payload}`, 'DELETE');
          const a = await apiCall('accounts');
          dispatch({ type: 'SET_DATA', payload: { contas: a.map(mapAccount) } });
        } catch {
          await db.pendingActions.add({ type, payload, timestamp: Date.now() });
        }
        dispatch({ type, payload });
        return;
      }
      case 'ADD_RENDA': {
        const body = { month: payload.mes, landlord: payload.proprietario, amount: payload.valor, status: payload.estado, notes: payload.obs };
        try {
          await apiCall('rentals', 'POST', body);
          const r = await apiCall('rentals');
          dispatch({ type: 'SET_DATA', payload: { rendas: r.map(mapRental) } });
        } catch {
          await db.pendingActions.add({ type, payload: body, timestamp: Date.now() });
          dispatch({ type, payload });
        }
        return;
      }
      case 'UPDATE_META': {
        const body = { savedAmount: payload.poupado, account_id: payload.account_id, increment: payload.increment };
        try {
          await apiCall(`goals/${payload.id}`, 'PUT', body);
          const [g, a, t] = await Promise.all([apiCall('goals'), apiCall('accounts'), apiCall('transactions')]);
          dispatch({ type: 'SET_DATA', payload: { metas: g.map(mapGoal), contas: a.map(mapAccount), transacoes: t.map(mapTransaction) } });
        } catch {
          await db.pendingActions.add({ type, payload: { id: payload.id, ...body }, timestamp: Date.now() });
          dispatch({ type, payload });
        }
        return;
      }
      case 'ADD_DEBT': {
        const body = { name: payload.name, total_amount: payload.total_amount, due_date: payload.due_date, interest_rate: payload.interest_rate || 0, account_id: payload.account_id };
        try {
          await apiCall('debts', 'POST', body);
          const [d, t, a] = await Promise.all([apiCall('debts'), apiCall('transactions'), apiCall('accounts')]);
          dispatch({ type: 'SET_DATA', payload: { dividas: d, transacoes: t.map(mapTransaction), contas: a.map(mapAccount) } });
        } catch {
          await db.dividas.add({ ...body, id: `offline-${Date.now()}`, remaining_amount: body.total_amount, status: 'pending' });
          await db.pendingActions.add({ type, payload: body, timestamp: Date.now() });
          dispatch({ type, payload });
        }
        return;
      }
      case 'PAY_DEBT': {
        const body = { debtId: payload.debtId, amount: payload.amount, payment_date: payload.payment_date, account_id: payload.account_id };
        try {
          await apiCall(`debts/${payload.debtId}/pay`, 'POST', body);
          const [d, t, a] = await Promise.all([apiCall('debts'), apiCall('transactions'), apiCall('accounts')]);
          dispatch({ type: 'SET_DATA', payload: { dividas: d, transacoes: t.map(mapTransaction), contas: a.map(mapAccount) } });
        } catch {
          await db.pendingActions.add({ type, payload: body, timestamp: Date.now() });
          dispatch({ type, payload });
        }
        return;
      }
      case 'ADD_ACCOUNT': {
        const body = { name: payload.name.trim(), type: payload.type, initial_balance: Number(payload.initial_balance || 0) };
        const res = await apiCall('accounts', 'POST', body);
        const [a, t] = await Promise.all([apiCall('accounts'), apiCall('transactions')]);
        dispatch({ type: 'SET_DATA', payload: { contas: a.map(mapAccount), transacoes: t.map(mapTransaction) } });
        return res;
      }
      case 'UPDATE_ACCOUNT_BALANCE': {
        await apiCall(`accounts/${payload.id}/balance`, 'PUT', { current_balance: payload.balance });
        const [a, t] = await Promise.all([apiCall('accounts'), apiCall('transactions')]);
        dispatch({ type: 'SET_DATA', payload: { contas: a.map(mapAccount), transacoes: t.map(mapTransaction) } });
        return;
      }
      case 'DELETE_ACCOUNT': {
        try {
          await apiCall(`accounts/${payload}`, 'DELETE');
          const a = await apiCall('accounts');
          dispatch({ type: 'SET_DATA', payload: { contas: a.map(mapAccount) } });
        } catch (err) {
          if (err.message.includes('400')) throw new Error('Não podes eliminar esta conta com transações dependentes.');
          throw err;
        }
        return;
      }
      case 'UPDATE_SETTING': await apiCall('settings', 'PUT', { [payload.key]: payload.value }); break;
      case 'UPDATE_USER': await apiCall('auth/me', 'PUT', payload); break;
      case 'ADD_ASSET': await apiCall('assets', 'POST', payload); break;
      case 'DELETE_ASSET': await apiCall(`assets/${payload}`, 'DELETE'); break;
      case 'SET_BUDGET': await apiCall('budgets', 'POST', { category: normalizeCategory(payload.category), limit: payload.limit }); break;
      case 'DELETE_BUDGET': await apiCall(`budgets/${payload}`, 'DELETE'); break;
    }
    dispatch(action);
  };

  const reloadData = useCallback((opt) => fetchSessionData(dispatch, opt), [dispatch]);
  useOfflineSync(FINANCE_API_URL, dispatch, reloadData);

  return (
    <FinanceContext.Provider value={{ state, dispatch: apiDispatch, reloadData }}>
      {children}
    </FinanceContext.Provider>
  );
}
