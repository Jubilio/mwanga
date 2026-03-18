import { createContext, useReducer, useEffect } from 'react';
import { generateDemoData } from '../utils/calculations';

// Define the API Base URL
let FINANCE_API_URL = import.meta.env.VITE_API_URL || '';
if (!FINANCE_API_URL.endsWith('/api')) {
  FINANCE_API_URL = `${FINANCE_API_URL.replace(/\/$/, '')}/api`;
}

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
  loans: [],
  loanApplications: [],
  settings: {
    user_salary: 50000,
    default_rent: 15000,
    landlord_name: '',
    housing_type: 'renda', // 'renda' or 'propria'
    financial_month_start_day: 25,
    daily_entry_reminder_enabled: true,
    daily_entry_reminder_time: '20:00',
    monthly_due_reminder_enabled: true,
    monthly_due_reminder_time: '08:00',
    monthly_due_reminder_period: 'inicio'
  },
  user: null,
  darkMode: true,
  loading: true,
};

function parseBooleanSetting(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

function normalizeSettings(rawSettings = {}) {
  return {
    ...defaultState.settings,
    ...rawSettings,
    financial_month_start_day: Number(rawSettings.financial_month_start_day || defaultState.settings.financial_month_start_day),
    daily_entry_reminder_enabled: parseBooleanSetting(
      rawSettings.daily_entry_reminder_enabled,
      defaultState.settings.daily_entry_reminder_enabled
    ),
    daily_entry_reminder_time: rawSettings.daily_entry_reminder_time || defaultState.settings.daily_entry_reminder_time,
    monthly_due_reminder_enabled: parseBooleanSetting(
      rawSettings.monthly_due_reminder_enabled,
      defaultState.settings.monthly_due_reminder_enabled
    ),
    monthly_due_reminder_time: rawSettings.monthly_due_reminder_time || defaultState.settings.monthly_due_reminder_time,
    monthly_due_reminder_period:
      rawSettings.monthly_due_reminder_period === 'fim' ? 'fim' : defaultState.settings.monthly_due_reminder_period
  };
}

function mapTransaction(t) {
  return {
    id: t.id,
    data: t.date,
    tipo: t.type,
    desc: t.description,
    valor: Number(t.amount || 0),
    cat: t.category,
    nota: t.note,
    account_id: t.account_id
  };
}

function mapRental(r) {
  return {
    id: r.id,
    mes: r.month,
    proprietario: r.landlord,
    valor: Number(r.amount || 0),
    estado: r.status,
    obs: r.notes
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, ...action.payload, loading: false };
    
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'ADD_TRANSACTION':
      return { ...state, transacoes: [action.payload, ...state.transacoes] };
    case 'DELETE_TRANSACTION':
      return { ...state, transacoes: state.transacoes.filter(t => t.id !== action.payload) };

    case 'ADD_RENDA': 
      return { ...state, rendas: [action.payload, ...state.rendas] };
    case 'DELETE_RENDA':
      return { ...state, rendas: state.rendas.filter(r => r.id !== action.payload) };

    case 'ADD_META':
      return { ...state, metas: [...state.metas, action.payload] };
    case 'UPDATE_META':
      return { ...state, metas: state.metas.map(m => m.id === action.payload.id ? { ...m, ...action.payload } : m) };
    case 'DELETE_META':
      return { ...state, metas: state.metas.filter(m => m.id !== action.payload) };

    case 'SET_BUDGET': {
      const existing = state.budgets.findIndex(b => b.category === action.payload.category);
      if (existing >= 0) {
        const updated = [...state.budgets];
        updated[existing] = { ...updated[existing], ...action.payload };
        return { ...state, budgets: updated };
      }
      return { ...state, budgets: [...state.budgets, action.payload] };
    }

    case 'UPDATE_SETTING':
      return { 
        ...state, 
        settings: { ...state.settings, [action.payload.key]: action.payload.value } 
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    case 'ADD_ASSET':
      return { ...state, activos: [...state.activos, action.payload] };
    case 'DELETE_ASSET':
      return { ...state, activos: state.activos.filter(a => a.id !== action.payload) };
    case 'ADD_LIABILITY':
      return { ...state, passivos: [...state.passivos, action.payload] };
    case 'DELETE_LIABILITY':
      return { ...state, passivos: state.passivos.filter(p => p.id !== action.payload) };

    case 'SET_XITIQUES':
      return { ...state, xitiques: action.payload };

    case 'ADD_DEBT':
      return { ...state, dividas: [action.payload, ...state.dividas] };
    case 'DELETE_DEBT':
      return { ...state, dividas: state.dividas.filter(d => d.id !== action.payload) };
    case 'SET_DEBTS':
      return { ...state, dividas: action.payload };

    case 'ADD_ACCOUNT':
      return { ...state, contas: [action.payload, ...state.contas] };
    case 'UPDATE_ACCOUNT_BALANCE':
      return { ...state, contas: state.contas.map(c => c.id === action.payload.id ? { ...c, current_balance: action.payload.balance } : c) };
    case 'DELETE_ACCOUNT':
      return { ...state, contas: state.contas.filter(c => c.id !== action.payload) };
    case 'SET_ACCOUNTS':
      return { ...state, contas: action.payload };

    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };
    
    default:
      return state;
  }
}

export const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const storedDarkMode = localStorage.getItem('mwanga-dark');
  const [state, dispatch] = useReducer(reducer, {
    ...defaultState,
    darkMode: storedDarkMode === null ? true : storedDarkMode === 'true'
  });

  // Initial Fetch from API
  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('mwanga-token');
      if (!token) {
        dispatch({ type: 'SET_DATA', payload: { loading: false } });
        return;
      }

      const headers = { 'Authorization': `Bearer ${token}` };

      const safeFetch = async (url) => {
        try {
          const res = await fetch(url, { headers });
          if (res.status === 401) {
            // Session expired or invalid — clear token so user is redirected to login
            console.warn(`Session expired (401): ${url}. Clearing token.`);
            localStorage.removeItem('mwanga-token');
            dispatch({ type: 'SET_DATA', payload: { loading: false } });
            return [];
          }
          if (res.status === 429) {
            console.warn(`Rate limited: ${url}`);
            return [];
          }
          if (!res.ok) {
            console.warn(`Failed fetch (${res.status}): ${url}`);
            return [];
          }
          const contentType = res.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            return [];
          }
          return await res.json();
        } catch (err) {
          console.warn(`Fetch failed for ${url}:`, err.message);
          return [];
        }
      };

      try {
        console.log('Fetching initial data from:', FINANCE_API_URL);
        const [ts, rendas, metas, budgets, assets, liabs, xitiques, settingsResp, user, debts, accounts, loanApplications, loans] = await Promise.all([
          safeFetch(`${FINANCE_API_URL}/transactions`),
          safeFetch(`${FINANCE_API_URL}/rentals`),
          safeFetch(`${FINANCE_API_URL}/goals`),
          safeFetch(`${FINANCE_API_URL}/budgets`),
          safeFetch(`${FINANCE_API_URL}/assets`),
          safeFetch(`${FINANCE_API_URL}/liabilities`),
          safeFetch(`${FINANCE_API_URL}/xitiques`),
          safeFetch(`${FINANCE_API_URL}/settings`),
          safeFetch(`${FINANCE_API_URL}/auth/me`),
          safeFetch(`${FINANCE_API_URL}/debts`),
          safeFetch(`${FINANCE_API_URL}/accounts`),
          safeFetch(`${FINANCE_API_URL}/credit/applications`),
          safeFetch(`${FINANCE_API_URL}/credit/loans`),
        ]);

        const mergedSettings = normalizeSettings(
          settingsResp && !Array.isArray(settingsResp) ? settingsResp : {}
        );

        dispatch({
          type: 'SET_DATA',
          payload: {
            transacoes: Array.isArray(ts) ? ts.map(mapTransaction) : [],
            rendas: Array.isArray(rendas) ? rendas.map(mapRental) : [],
            metas: Array.isArray(metas) ? metas.map(m => ({
              id: m.id,
              nome: m.name,
              alvo: Number(m.target_amount || 0),
              poupado: Number(m.saved_amount || 0),
              prazo: m.deadline,
              cat: m.category,
              mensal: Number(m.monthly_saving || 0)
            })) : [],
            budgets: Array.isArray(budgets) ? budgets.map(b => ({ id: b.id, category: b.category, limit: Number(b.limit_amount || 0) })) : [],
            activos: Array.isArray(assets) ? assets.map(a => ({ id: a.id, name: a.name, type: a.type, value: Number(a.value || 0) })) : [],
            passivos: Array.isArray(liabs) ? liabs.map(l => ({ 
              id: l.id, 
              name: l.name, 
              total: Number(l.total_amount || 0), 
              restante: Number(l.remaining_amount || 0), 
              interestRate: Number(l.interest_rate || 0) 
            })) : [],
            xitiques: Array.isArray(xitiques) ? xitiques.map(x => ({
              ...x,
              monthly_amount: Number(x.monthly_amount || 0),
              contributions: x.contributions?.map(c => ({ ...c, amount: Number(c.amount || 0) })) || [],
              receipts: x.receipts?.map(r => ({ ...r, total_received: Number(r.total_received || 0) })) || []
            })) : [],
            dividas: Array.isArray(debts) ? debts.map(d => ({
              ...d,
              total_amount: Number(d.total_amount || 0),
              remaining_amount: Number(d.remaining_amount || 0),
              payments: d.payments?.map(p => ({ ...p, amount: Number(p.amount || 0) })) || []
            })) : [],
            contas: Array.isArray(accounts) ? accounts.map(acc => ({
              ...acc,
              initial_balance: Number(acc.initial_balance || 0),
              current_balance: Number(acc.current_balance || 0)
            })) : [],
            loanApplications: Array.isArray(loanApplications) ? loanApplications : [],
            loans: Array.isArray(loans) ? loans : [],
            settings: mergedSettings,
            loading: false
          }
        });

        if (user) dispatch({ type: 'SET_USER', payload: user });

      } catch (e) {
        console.error('API Fetch failed, using demo data:', e);
        const demo = generateDemoData();
        dispatch({ type: 'SET_DATA', payload: { ...demo, loading: false } });
      }
    }
    fetchData();
  }, []);

  // Persist dark mode
  useEffect(() => {
    localStorage.setItem('mwanga-dark', state.darkMode);
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.darkMode]);

  // apiDispatch wrapper for persistence
  const apiDispatch = async (action) => {
    const token = localStorage.getItem('mwanga-token');
    const headers = { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    try {
      let payload = action.payload;
      switch (action.type) {
        case 'ADD_TRANSACTION': {
          const txBody = {
            date: action.payload.data,
            type: action.payload.tipo,
            description: action.payload.desc,
            amount: action.payload.valor,
            category: action.payload.cat,
            note: action.payload.nota
          };
          payload = await fetch(`${FINANCE_API_URL}/transactions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(txBody)
          }).then(r => r.json());
          payload = { ...action.payload, id: payload.id };
          break;
        }
        case 'DELETE_TRANSACTION':
          await fetch(`${FINANCE_API_URL}/transactions/${action.payload}`, { 
            method: 'DELETE',
            headers
          });
          break;
        case 'ADD_RENDA': {
          const rentalBody = {
            month: action.payload.mes,
            landlord: action.payload.proprietario,
            amount: action.payload.valor,
            status: action.payload.estado,
            notes: action.payload.obs
          };
          const resp = await fetch(`${FINANCE_API_URL}/rentals`, {
            method: 'POST',
            headers,
            body: JSON.stringify(rentalBody)
          });
          if (!resp.ok) throw new Error('Failed to add rental');
          const data = await resp.json();
          const [refreshRentals, refreshTransactions] = await Promise.all([
            fetch(`${FINANCE_API_URL}/rentals`, { headers }).then(r => r.json()),
            fetch(`${FINANCE_API_URL}/transactions`, { headers }).then(r => r.json())
          ]);
          dispatch({
            type: 'SET_DATA',
            payload: {
              rendas: Array.isArray(refreshRentals) ? refreshRentals.map(mapRental) : [],
              transacoes: Array.isArray(refreshTransactions) ? refreshTransactions.map(mapTransaction) : []
            }
          });
          return data;
        }
        case 'DELETE_RENDA': {
          await fetch(`${FINANCE_API_URL}/rentals/${action.payload}`, { 
            method: 'DELETE',
            headers
          });
          const [refreshRentals, refreshTransactions] = await Promise.all([
            fetch(`${FINANCE_API_URL}/rentals`, { headers }).then(r => r.json()),
            fetch(`${FINANCE_API_URL}/transactions`, { headers }).then(r => r.json())
          ]);
          dispatch({
            type: 'SET_DATA',
            payload: {
              rendas: Array.isArray(refreshRentals) ? refreshRentals.map(mapRental) : [],
              transacoes: Array.isArray(refreshTransactions) ? refreshTransactions.map(mapTransaction) : []
            }
          });
          return;
        }
        case 'ADD_META': {
          const metaBody = {
            name: action.payload.nome,
            targetAmount: action.payload.alvo,
            savedAmount: action.payload.poupado,
            deadline: action.payload.prazo,
            category: action.payload.cat,
            monthlySaving: action.payload.mensal
          };
          const savedMeta = await fetch(`${FINANCE_API_URL}/goals`, {
            method: 'POST',
            headers,
            body: JSON.stringify(metaBody)
          }).then(r => r.json());
          payload = { ...action.payload, id: savedMeta.id };
          break;
        }
        case 'UPDATE_META':
          await fetch(`${FINANCE_API_URL}/goals/${action.payload.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ savedAmount: action.payload.poupado })
          });
          break;
        case 'DELETE_META':
          await fetch(`${FINANCE_API_URL}/goals/${action.payload}`, { 
            method: 'DELETE',
            headers
          });
          break;
        case 'SET_BUDGET':
          await fetch(`${FINANCE_API_URL}/budgets`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              category: action.payload.category,
              limit: action.payload.limit
            })
          });
          break;
        case 'ADD_ASSET': {
          const assetRet = await fetch(`${FINANCE_API_URL}/assets`, {
            method: 'POST',
            headers,
            body: JSON.stringify(action.payload)
          }).then(r => r.json());
          payload = { ...action.payload, id: assetRet.id };
          break;
        }
        case 'DELETE_ASSET':
          await fetch(`${FINANCE_API_URL}/assets/${action.payload}`, { 
            method: 'DELETE',
            headers
          });
          break;
        case 'ADD_LIABILITY': {
          const liabBody = {
            name: action.payload.name,
            totalAmount: action.payload.totalAmount,
            remainingAmount: action.payload.remainingAmount,
            interestRate: action.payload.interestRate
          };
          const liabRet = await fetch(`${FINANCE_API_URL}/liabilities`, {
            method: 'POST',
            headers,
            body: JSON.stringify(liabBody)
          }).then(r => r.json());
          payload = { ...action.payload, id: liabRet.id };
          break;
        }
        case 'DELETE_LIABILITY':
          await fetch(`${FINANCE_API_URL}/liabilities/${action.payload}`, { 
            method: 'DELETE',
            headers
          });
          break;
        
        case 'ADD_XITIQUE': {
          const xBody = {
            name: action.payload.name,
            monthlyAmount: action.payload.monthly_amount,
            totalParticipants: action.payload.total_participants,
            startDate: action.payload.start_date,
            yourPosition: action.payload.your_position
          };
          await fetch(`${FINANCE_API_URL}/xitiques`, {
            method: 'POST',
            headers,
            body: JSON.stringify(xBody)
          }).then(r => r.json());
          const fullData = await fetch(`${FINANCE_API_URL}/xitiques`, { headers }).then(r => r.json());
          dispatch({ type: 'SET_XITIQUES', payload: fullData });
          return;
        }
        case 'DELETE_XITIQUE': {
          await fetch(`${FINANCE_API_URL}/xitiques/${action.payload}`, { 
            method: 'DELETE',
            headers
          });
          const updatedX = await fetch(`${FINANCE_API_URL}/xitiques`, { headers }).then(r => r.json());
          dispatch({ type: 'SET_XITIQUES', payload: updatedX });
          return;
        }
        case 'PAY_XITIQUE': {
          await fetch(`${FINANCE_API_URL}/xitiques/pay/${action.payload.contributionId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ date: action.payload.date })
          });
          const refreshX = await fetch(`${FINANCE_API_URL}/xitiques`, { headers }).then(r => r.json());
          const refreshT = await fetch(`${FINANCE_API_URL}/transactions`, { headers }).then(r => r.json());
          dispatch({ type: 'SET_XITIQUES', payload: refreshX });
          dispatch({ type: 'SET_DATA', payload: { 
            transacoes: refreshT.map(mapTransaction)
          }});
          return;
        }
        case 'RECEIVE_XITIQUE': {
          await fetch(`${FINANCE_API_URL}/xitiques/receive/${action.payload.receiptId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ date: action.payload.date })
          });
          const refreshX2 = await fetch(`${FINANCE_API_URL}/xitiques`, { headers }).then(r => r.json());
          const refreshT2 = await fetch(`${FINANCE_API_URL}/transactions`, { headers }).then(r => r.json());
          dispatch({ type: 'SET_XITIQUES', payload: refreshX2 });
          dispatch({ type: 'SET_DATA', payload: { 
            transacoes: refreshT2.map(mapTransaction)
          }});
          return;
        }

        case 'APPLY_SALARY_BUDGET': {
          const { needs, wants, savings } = action.payload;
          const saveBudget = (cat, val) => fetch(`${FINANCE_API_URL}/budgets`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ category: cat, limit: val })
          });

          await Promise.all([
            saveBudget('Renda', needs * 0.4),
            saveBudget('Alimentação', needs * 0.4),
            saveBudget('Transporte', needs * 0.1),
            saveBudget('Saúde', needs * 0.1),
            saveBudget('Lazer', wants * 0.7),
            saveBudget('Outros', wants * 0.3),
            saveBudget('Poupanca', savings * 1.0)
          ]);

          const refreshB = await fetch(`${FINANCE_API_URL}/budgets`, { headers }).then(r => r.json());
          dispatch({ type: 'SET_DATA', payload: { budgets: refreshB } });
          return;
        }
        case 'UPDATE_SETTING': {
          await fetch(`${FINANCE_API_URL}/settings`, {
            method: 'POST',
            headers,
            body: JSON.stringify(action.payload)
          });
          break;
        }
        case 'UPDATE_USER': {
          await fetch(`${FINANCE_API_URL}/auth/profile`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(action.payload)
          });
          break;
        }
        case 'UPDATE_HOUSEHOLD': {
          await fetch(`${FINANCE_API_URL}/households`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(action.payload)
          });
          break;
        }
        case 'ADD_DEBT': {
          const debtBody = {
            creditor_name: action.payload.creditor_name,
            total_amount: action.payload.total_amount,
            due_date: action.payload.due_date || null
          };
          const debtRet = await fetch(`${FINANCE_API_URL}/debts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(debtBody)
          }).then(r => r.json());
          payload = { ...action.payload, id: debtRet.id, payments: [] };
          break;
        }
        case 'DELETE_DEBT': {
          await fetch(`${FINANCE_API_URL}/debts/${action.payload}`, { 
            method: 'DELETE',
            headers
          });
          break;
        }
        case 'PAY_DEBT': {
          await fetch(`${FINANCE_API_URL}/debts/${action.payload.debtId}/pay`, {
            method: 'POST',
            headers,
            body: JSON.stringify(action.payload)
          });
          const refreshD = await fetch(`${FINANCE_API_URL}/debts`, { headers }).then(r => r.json());
          dispatch({ type: 'SET_DEBTS', payload: refreshD });
          return;
        }
        case 'ADD_ACCOUNT': {
          const accRet = await fetch(`${FINANCE_API_URL}/accounts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(action.payload)
          }).then(r => r.json());
          payload = { ...action.payload, id: accRet.id, current_balance: action.payload.initial_balance };
          break;
        }
        case 'UPDATE_ACCOUNT_BALANCE': {
          await fetch(`${FINANCE_API_URL}/accounts/${action.payload.id}/balance`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ current_balance: action.payload.balance })
          });
          break;
        }
        case 'DELETE_ACCOUNT': {
          await fetch(`${FINANCE_API_URL}/accounts/${action.payload}`, { 
            method: 'DELETE',
            headers
          });
          break;
        }
      }
      dispatch({ ...action, payload });
    } catch (e) {
      console.error('API Action failed:', e);
    }
  };

  return (
    <FinanceContext.Provider value={{ state, dispatch: apiDispatch }}>
      {children}
    </FinanceContext.Provider>
  );
}

