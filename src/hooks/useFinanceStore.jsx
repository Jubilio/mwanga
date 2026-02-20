import { createContext, useContext, useReducer, useEffect } from 'react';
import { generateDemoData } from '../utils/calculations';

// Define the API Base URL
const FINANCE_API_URL = 'http://localhost:3001/api';

const defaultState = {
  transacoes: [],
  rendas: [],
  metas: [],
  budgets: [],
  activos: [],
  passivos: [],
  xitiques: [],
  settings: {
    user_salary: 50000,
    default_rent: 15000,
    landlord_name: '',
    housing_type: 'renda' // 'renda' or 'propria'
  },
  user: null,
  darkMode: false,
  loading: true,
};

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

    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };
    
    default:
      return state;
  }
}

const FinanceContext = createContext(null);

export function FinanceProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { ...defaultState, darkMode: localStorage.getItem('mwanga-dark') === 'true' });

  // Initial Fetch from API
  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('mwanga-token');
      if (!token) {
        dispatch({ type: 'SET_DATA', payload: { loading: false } });
        return;
      }

      const headers = { 'Authorization': `Bearer ${token}` };

      try {
        console.log('Fetching initial data from:', FINANCE_API_URL);
        const [ts, rendas, metas, budgets, assets, liabs, xitiques, settings, user] = await Promise.all([
          fetch(`${FINANCE_API_URL}/transactions`, { headers }).then(r => r.json()),
          fetch(`${FINANCE_API_URL}/rentals`, { headers }).then(r => r.json()),
          fetch(`${FINANCE_API_URL}/goals`, { headers }).then(r => r.json()),
          fetch(`${FINANCE_API_URL}/budgets`, { headers }).then(r => r.json()),
          fetch(`${FINANCE_API_URL}/assets`, { headers }).then(r => r.json()),
          fetch(`${FINANCE_API_URL}/liabilities`, { headers }).then(r => r.json()),
          fetch(`${FINANCE_API_URL}/xitiques`, { headers }).then(r => r.json()),
          fetch(`${FINANCE_API_URL}/settings`, { headers }).then(r => r.json()),
          fetch(`${FINANCE_API_URL}/auth/me`, { headers }).then(r => r.json()),
        ]);

        dispatch({
          type: 'SET_DATA',
          payload: {
            transacoes: Array.isArray(ts) ? ts.map(t => ({
              id: t.id,
              data: t.date,
              tipo: t.type,
              desc: t.description,
              valor: t.amount,
              cat: t.category,
              nota: t.note
            })) : [],
            rendas: Array.isArray(rendas) ? rendas.map(r => ({
              id: r.id,
              mes: r.month,
              proprietario: r.landlord,
              valor: r.amount,
              estado: r.status,
              obs: r.notes
            })) : [],
            metas: Array.isArray(metas) ? metas.map(m => ({
              id: m.id,
              nome: m.name,
              alvo: m.target_amount,
              poupado: m.saved_amount,
              prazo: m.deadline,
              cat: m.category,
              mensal: m.monthly_saving
            })) : [],
            budgets: Array.isArray(budgets) ? budgets.map(b => ({ id: b.id, category: b.category, limit: b.limit_amount })) : [],
            activos: Array.isArray(assets) ? assets.map(a => ({ id: a.id, name: a.name, type: a.type, value: a.value })) : [],
            passivos: Array.isArray(liabs) ? liabs.map(l => ({ 
              id: l.id, 
              name: l.name, 
              total: l.total_amount, 
              restante: l.remaining_amount, 
              interestRate: l.interest_rate 
            })) : [],
            xitiques: Array.isArray(xitiques) ? xitiques : [],
            settings: settings || defaultState.settings
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
          payload = { ...action.payload, id: data.id };
          break;
        }
        case 'DELETE_RENDA':
          await fetch(`${FINANCE_API_URL}/rentals/${action.payload}`, { 
            method: 'DELETE',
            headers
          });
          break;
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
            transacoes: refreshT.map(t => ({
              id: t.id, data: t.date, tipo: t.type, desc: t.description, valor: t.amount, cat: t.category, nota: t.note
            }))
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
            transacoes: refreshT2.map(t => ({
              id: t.id, data: t.date, tipo: t.type, desc: t.description, valor: t.amount, cat: t.category, nota: t.note
            }))
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

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within FinanceProvider');
  return context;
}
