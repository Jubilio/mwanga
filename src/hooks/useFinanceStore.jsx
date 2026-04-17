import { useReducer, useEffect } from 'react';
import { FinanceContext } from './FinanceContext';
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
    monthly_due_reminder_period: 'inicio',
    onboarding_completed: true,
    subscription_tier: 'free' // Correto: 'free' | 'growth' | 'pro' — valor real vem da API
  },
  user: null,
  darkMode: true,
  loading: true,
};

function createInitialState(darkMode) {
  return {
    ...defaultState,
    darkMode
  };
}

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
      rawSettings.monthly_due_reminder_period === 'fim' ? 'fim' : defaultState.settings.monthly_due_reminder_period,
    subscription_tier: rawSettings.subscription_tier || 'pro' // Default to 'pro' for development
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

function mapGoal(m) {
  return {
    id: m.id,
    nome: m.name,
    alvo: Number(m.target_amount || 0),
    poupado: Number(m.saved_amount || 0),
    prazo: m.deadline,
    cat: m.category,
    mensal: Number(m.monthly_saving || 0)
  };
}

function mapAccount(acc) {
  return {
    ...acc,
    initial_balance: Number(acc.initial_balance || 0),
    current_balance: Number(acc.current_balance || 0)
  };
}

function mapXitique(x) {
  return {
    ...x,
    monthly_amount: Number(x.monthly_amount || 0),
    total_participants: Number(x.total_participants || 0),
    your_position: Number(x.your_position || 0),
    cycles: Array.isArray(x.cycles)
      ? x.cycles.map(cycle => ({
        ...cycle,
        cycle_number: Number(cycle.cycle_number || 0),
        receiver_position: Number(cycle.receiver_position || 0)
      }))
      : [],
    contributions: Array.isArray(x.contributions)
      ? x.contributions.map(contribution => ({
        ...contribution,
        amount: Number(contribution.amount || 0),
        paid: contribution.paid === true || contribution.paid === 1 || contribution.paid === '1'
      }))
      : [],
    receipts: Array.isArray(x.receipts)
      ? x.receipts.map(receipt => ({
        ...receipt,
        total_received: Number(receipt.total_received || 0)
      }))
      : []
  };
}

// Run up to `concurrency` fetches at a time to avoid HTTP/2 stream exhaustion
// on the Render.com free-tier server which rejects too many parallel streams.
async function batchFetch(tasks, concurrency = 5) {
  const results = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ─── Fetch de dados via endpoint agregado (1 chamada) ────────────────────────
// Preferimos o endpoint /dashboard-summary que faz 1 round-trip em vez de 13.
// Se falhar (ex: servidor antigo, cold start do Render), fazemos fallback
// para chamadas individuais garantindo retro-compatibilidade.
//
// NOTÁ: Não usamos AbortSignal.timeout aqui porque o Render free-tier precisa
// de 30-60s de cold start. O loading screen já dá feedback visual ao utilizador.
async function fetchAllData(headers, dispatch) {
  // ── Tentativa 1: Endpoint Agregado (caminho feliz) ───────────────────────────
  try {
    // Sem timeout agressivo — o Render free-tier precisa de 30-60s de cold start.
    // O splash screen / loading state já garante feedback visual durante a espera.
    const res = await fetch(`${FINANCE_API_URL}/dashboard-summary`, { headers });

    if (res.status === 401) {
      localStorage.removeItem('mwanga-token');
      dispatch({ type: 'RESET_SESSION' });
      return null;
    }

    // 404/405 — endpoint ainda não deployado no servidor de produção.
    // Silencioso: o fallback abaixo carrega os dados via chamadas individuais.
    if (res.status === 404 || res.status === 405) {
      if (import.meta.env.DEV) {
        console.info(
          '[Mwanga] /api/dashboard-summary não disponível neste servidor.\n' +
          'A usar fallback (13 chamadas individuais). Faz deploy do backend para activar.'
        );
      }
    } else if (res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        return {
          ts: data.transactions,
          rendas: data.rentals,
          metas: data.goals,
          budgets: data.budgets,
          assets: data.assets,
          liabs: data.liabilities,
          xitiques: data.xitiques,
          settingsResp: data.settings,
          user: data.user,
          debts: data.debts,
          accounts: data.accounts,
          loanApplications: data.loanApplications,
          loans: data.loans,
        };
      }
    }
  } catch (err) {
    // Loga apenas erros inesperados (CORS, rede caída) — não timeouts normais.
    if (import.meta.env.DEV) {
      console.warn('[Mwanga] Endpoint agregado falhou, a usar fallback:', err?.message);
    }
  }

  // ── Tentativa 2: Chamadas individuais (fallback retro-compatível) ───────────
  // Se chegamos aqui, o servidor já foi "acordado" pelo primeiro request.
  // As chamadas individuais devem ser rápidas ou estar em warm-up.
  const SF = async (url) => {
    try {
      const r = await fetch(url, { headers });
      if (r.status === 401) {
        localStorage.removeItem('mwanga-token');
        dispatch({ type: 'RESET_SESSION' });
        return [];
      }
      if (!r.ok) return [];
      const ct = r.headers.get('content-type');
      if (!ct || !ct.includes('application/json')) return [];
      return await r.json();
    } catch {
      return [];
    }
  };

  const endpoints = [
    `${FINANCE_API_URL}/transactions`,
    `${FINANCE_API_URL}/rentals`,
    `${FINANCE_API_URL}/goals`,
    `${FINANCE_API_URL}/budgets`,
    `${FINANCE_API_URL}/assets`,
    `${FINANCE_API_URL}/liabilities`,
    `${FINANCE_API_URL}/xitiques`,
    `${FINANCE_API_URL}/settings`,
    `${FINANCE_API_URL}/auth/me`,
    `${FINANCE_API_URL}/debts`,
    `${FINANCE_API_URL}/accounts`,
    `${FINANCE_API_URL}/credit/applications`,
    `${FINANCE_API_URL}/credit/loans`,
  ];

  const [ts, rendas, metas, budgets, assets, liabs, xitiques, settingsResp, user, debts, accounts, loanApplications, loans] =
    await batchFetch(endpoints.map(url => () => SF(url)));

  return { ts, rendas, metas, budgets, assets, liabs, xitiques, settingsResp, user, debts, accounts, loanApplications, loans };
}

async function fetchSessionData(dispatch, { preferredUser = null } = {}) {
  const token = localStorage.getItem('mwanga-token');
  if (!token) {
    dispatch({ type: 'RESET_SESSION' });
    return null;
  }

  const headers = { Authorization: `Bearer ${token}` };

  try {
    const fetched = await fetchAllData(headers, dispatch);

    // fetchAllData retorna null em caso de 401 — a sessão foi resetada
    // pelo dispatcher interno. Não continuamos o processamento.
    if (fetched === null) return null;

    const { ts, rendas, metas, budgets, assets, liabs, xitiques, settingsResp, user, debts, accounts, loanApplications, loans } = fetched;

    const mergedSettings = normalizeSettings(
      settingsResp && !Array.isArray(settingsResp) ? settingsResp : {}
    );

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

    return resolvedUser;
  } catch {
    const demo = generateDemoData();
    dispatch({ type: 'SET_DATA', payload: { ...demo, user: preferredUser || null } });
    return preferredUser || null;
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, ...action.payload, loading: false };

    case 'RESET_SESSION':
      return { ...createInitialState(state.darkMode), loading: false };

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
    case 'DELETE_BUDGET':
      return {
        ...state,
        budgets: state.budgets.filter(
          budget => budget.id !== action.payload && budget.category !== action.meta?.category
        )
      };

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


export function FinanceProvider({ children }) {
  const storedDarkMode = localStorage.getItem('mwanga-dark');
  const [state, dispatch] = useReducer(reducer, {
    ...createInitialState(storedDarkMode === null ? true : storedDarkMode === 'true')
  });

  // Initial Fetch from API
  useEffect(() => {
    // Guard flag to handle React StrictMode double-invoke
    let aborted = false;

    async function fetchData() {
      const token = localStorage.getItem('mwanga-token');
      if (!token) {
        dispatch({ type: 'SET_DATA', payload: { loading: false } });
        return;
      }

      const headers = { 'Authorization': `Bearer ${token}` };

      try {
        const fetched = await fetchAllData(headers, dispatch);

        // fetchAllData retorna null em caso de 401 — sessão já foi resetada.
        if (fetched === null || aborted) return;

        const { ts, rendas, metas, budgets, assets, liabs, xitiques, settingsResp, user, debts, accounts, loanApplications, loans } = fetched;

        const mergedSettings = normalizeSettings(
          settingsResp && !Array.isArray(settingsResp) ? settingsResp : {}
        );

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
            loading: false
          }
        });

        if (user) dispatch({ type: 'SET_USER', payload: user });

      } catch (e) {
        if (aborted) return;
        // Falha silenciosa: mostra demo data para que o utilizador veja o produto
        // mesmo sem conexão. O utilizador pode tentar novamente com o botão de refresh.
        const demo = generateDemoData();
        dispatch({ type: 'SET_DATA', payload: { ...demo, loading: false } });
      }
    }

    fetchData();
    return () => { aborted = true; };
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
            note: action.payload.nota,
            account_id: action.payload.account_id
          };
          const resp = await fetch(`${FINANCE_API_URL}/transactions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(txBody)
          });
          if (!resp.ok) throw new Error('Failed to add transaction');

          // Re-fetch transactions AND accounts to ensure perfect sync
          const [refreshT, refreshAccounts] = await Promise.all([
            fetch(`${FINANCE_API_URL}/transactions`, { headers }).then(r => r.json()),
            fetch(`${FINANCE_API_URL}/accounts`, { headers }).then(r => r.json())
          ]);
          dispatch({
            type: 'SET_DATA',
            payload: {
              transacoes: Array.isArray(refreshT) ? refreshT.map(mapTransaction) : [],
              contas: Array.isArray(refreshAccounts) ? refreshAccounts.map(acc => ({
                ...acc,
                initial_balance: Number(acc.initial_balance || 0),
                current_balance: Number(acc.current_balance || 0)
              })) : []
            }
          });
          return;
        }
        case 'DELETE_TRANSACTION': {
          await fetch(`${FINANCE_API_URL}/transactions/${action.payload}`, {
            method: 'DELETE',
            headers
          });
          // Re-fetch transactions AND accounts (delete now reverses balance)
          const [refreshT2, refreshAccounts2] = await Promise.all([
            fetch(`${FINANCE_API_URL}/transactions`, { headers }).then(r => r.json()),
            fetch(`${FINANCE_API_URL}/accounts`, { headers }).then(r => r.json())
          ]);
          dispatch({
            type: 'SET_DATA',
            payload: {
              transacoes: Array.isArray(refreshT2) ? refreshT2.map(mapTransaction) : [],
              contas: Array.isArray(refreshAccounts2) ? refreshAccounts2.map(acc => ({
                ...acc,
                initial_balance: Number(acc.initial_balance || 0),
                current_balance: Number(acc.current_balance || 0)
              })) : []
            }
          });
          return;
        }
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
        case 'UPDATE_META': {
          const updateBody = {
            savedAmount: action.payload.poupado,
            account_id: action.payload.account_id,
            increment: action.payload.increment
          };
          await fetch(`${FINANCE_API_URL}/goals/${action.payload.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(updateBody)
          });

          // Re-fetch everything to ensure perfect sync
          const [refreshGoals, refreshAccs, refreshTxs] = await Promise.all([
            fetch(`${FINANCE_API_URL}/goals`, { headers }).then(r => r.json()),
            fetch(`${FINANCE_API_URL}/accounts`, { headers }).then(r => r.json()),
            fetch(`${FINANCE_API_URL}/transactions`, { headers }).then(r => r.json())
          ]);

          dispatch({
            type: 'SET_DATA',
            payload: {
              metas: Array.isArray(refreshGoals) ? refreshGoals.map(mapGoal) : [],
              contas: Array.isArray(refreshAccs) ? refreshAccs.map(mapAccount) : [],
              transacoes: Array.isArray(refreshTxs) ? refreshTxs.map(mapTransaction) : []
            }
          });
          return;
        }
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
          {
            const refreshBudgets = await fetch(`${FINANCE_API_URL}/budgets`, { headers }).then(r => r.json());
            dispatch({
              type: 'SET_DATA',
              payload: {
                budgets: Array.isArray(refreshBudgets)
                  ? refreshBudgets.map(b => ({
                    id: b.id,
                    category: b.category,
                    limit: Number(b.limit_amount || 0)
                  }))
                  : []
              }
            });
          }
          return;
        case 'DELETE_BUDGET': {
          await fetch(`${FINANCE_API_URL}/budgets/${action.payload}`, {
            method: 'DELETE',
            headers
          });
          const refreshBudgets = await fetch(`${FINANCE_API_URL}/budgets`, { headers }).then(r => r.json());
          dispatch({
            type: 'SET_DATA',
            payload: {
              budgets: Array.isArray(refreshBudgets)
                ? refreshBudgets.map(b => ({
                  id: b.id,
                  category: b.category,
                  limit: Number(b.limit_amount || 0)
                }))
                : []
            }
          });
          return;
        }
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

        case 'ADD_XITIQUES':
        case 'ADD_XITIQUE': {
          const xBody = {
            name: action.payload.name,
            monthlyAmount: action.payload.monthly_amount,
            totalParticipants: action.payload.total_participants,
            startDate: action.payload.start_date,
            yourPosition: action.payload.your_position
          };
          const createResp = await fetch(`${FINANCE_API_URL}/xitiques`, {
            method: 'POST',
            headers,
            body: JSON.stringify(xBody)
          });
          if (!createResp.ok) {
            const errorData = await createResp.json().catch(() => ({}));
            throw new Error(errorData?.error || 'Failed to create xitique');
          }

          const fullData = await fetch(`${FINANCE_API_URL}/xitiques`, { headers }).then(r => r.json());
          dispatch({ type: 'SET_XITIQUES', payload: Array.isArray(fullData) ? fullData.map(mapXitique) : [] });
          return;
        }
        case 'DELETE_XITIQUE': {
          await fetch(`${FINANCE_API_URL}/xitiques/${action.payload}`, {
            method: 'DELETE',
            headers
          });
          const updatedX = await fetch(`${FINANCE_API_URL}/xitiques`, { headers }).then(r => r.json());
          dispatch({ type: 'SET_XITIQUES', payload: Array.isArray(updatedX) ? updatedX.map(mapXitique) : [] });
          return;
        }
        case 'PAY_XITIQUE': {
          const payResp = await fetch(`${FINANCE_API_URL}/xitiques/pay/${action.payload.contributionId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              date: action.payload.date,
              account_id: action.payload.account_id || undefined
            })
          });
          if (!payResp.ok) {
            const errorData = await payResp.json().catch(() => ({}));
            throw new Error(errorData?.error || 'Failed to pay xitique contribution');
          }
          const [refreshX, refreshT, refreshAccounts] = await Promise.all([
            fetch(`${FINANCE_API_URL}/xitiques`, { headers }).then(r => r.json()),
            fetch(`${FINANCE_API_URL}/transactions`, { headers }).then(r => r.json()),
            fetch(`${FINANCE_API_URL}/accounts`, { headers }).then(r => r.json())
          ]);
          dispatch({ type: 'SET_XITIQUES', payload: Array.isArray(refreshX) ? refreshX.map(mapXitique) : [] });
          dispatch({
            type: 'SET_DATA', payload: {
              transacoes: refreshT.map(mapTransaction),
              contas: Array.isArray(refreshAccounts) ? refreshAccounts.map(mapAccount) : []
            }
          });
          return;
        }
        case 'RECEIVE_XITIQUE': {
          const receiveResp = await fetch(`${FINANCE_API_URL}/xitiques/receive/${action.payload.receiptId}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              date: action.payload.date,
              account_id: action.payload.account_id || undefined
            })
          });
          if (!receiveResp.ok) {
            const errorData = await receiveResp.json().catch(() => ({}));
            throw new Error(errorData?.error || 'Failed to receive xitique funds');
          }
          const [refreshX2, refreshT2, refreshAccounts2] = await Promise.all([
            fetch(`${FINANCE_API_URL}/xitiques`, { headers }).then(r => r.json()),
            fetch(`${FINANCE_API_URL}/transactions`, { headers }).then(r => r.json()),
            fetch(`${FINANCE_API_URL}/accounts`, { headers }).then(r => r.json())
          ]);
          dispatch({ type: 'SET_XITIQUES', payload: Array.isArray(refreshX2) ? refreshX2.map(mapXitique) : [] });
          dispatch({
            type: 'SET_DATA', payload: {
              transacoes: refreshT2.map(mapTransaction),
              contas: Array.isArray(refreshAccounts2) ? refreshAccounts2.map(mapAccount) : []
            }
          });
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
          const paymentBody = {
            amount: action.payload.amount,
            payment_date: action.payload.payment_date,
            account_id: action.payload.account_id || undefined
          };
          await fetch(`${FINANCE_API_URL}/debts/${action.payload.debtId}/pay`, {
            method: 'POST',
            headers,
            body: JSON.stringify(paymentBody)
          });
          const [refreshD, refreshT, refreshAccounts] = await Promise.all([
            fetch(`${FINANCE_API_URL}/debts`, { headers }).then(r => r.json()),
            fetch(`${FINANCE_API_URL}/transactions`, { headers }).then(r => r.json()),
            fetch(`${FINANCE_API_URL}/accounts`, { headers }).then(r => r.json())
          ]);
          dispatch({ type: 'SET_DEBTS', payload: Array.isArray(refreshD) ? refreshD : [] });
          dispatch({
            type: 'SET_DATA',
            payload: {
              transacoes: Array.isArray(refreshT) ? refreshT.map(mapTransaction) : [],
              contas: Array.isArray(refreshAccounts) ? refreshAccounts.map(mapAccount) : []
            }
          });
          return;
        }
        case 'ADD_ACCOUNT': {
          const accountBody = {
            name: String(action.payload.name || '').trim(),
            type: action.payload.type,
            initial_balance: Number(action.payload.initial_balance || 0)
          };
          const accResp = await fetch(`${FINANCE_API_URL}/accounts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(accountBody)
          });
          if (!accResp.ok) {
            let errorMessage = `Failed to add account (${accResp.status})`;
            try {
              const errorData = await accResp.json();
              const detailText = Array.isArray(errorData?.details)
                ? errorData.details
                  .map((item) => {
                    const path = Array.isArray(item?.path) ? item.path.join('.') : '';
                    return [path, item?.message].filter(Boolean).join(': ');
                  })
                  .filter(Boolean)
                  .join(', ')
                : '';
              errorMessage = detailText || errorData?.message || errorData?.error || errorMessage;
            } catch {
              // Ignore invalid error payloads and keep fallback message
            }
            throw new Error(errorMessage);
          }
          const accRet = await accResp.json();
          payload = {
            ...accountBody,
            id: accRet.id,
            current_balance: accountBody.initial_balance
          };
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
          const resp = await fetch(`${FINANCE_API_URL}/accounts/${action.payload}`, {
            method: 'DELETE',
            headers
          });
          if (!resp.ok) {
            throw new Error('Não podes eliminar esta conta porque já existem transações (receitas/despesas) dependentes dela.');
          }
          break;
        }
      }
      dispatch({ ...action, payload });
    } catch (err) {
      // Re-lançamos o erro para que o chamador possa reagir (ex: mostrar toast de erro).
      // Não fazemos console.error aqui para evitar duplicação — o erro será capturado
      // pelo handler do componente que chamou apiDispatch().
      throw err;
    }
  };

  return (
    <FinanceContext.Provider value={{ state, dispatch: apiDispatch, reloadData: (options) => fetchSessionData(dispatch, options) }}>
      {children}
    </FinanceContext.Provider>
  );
}
