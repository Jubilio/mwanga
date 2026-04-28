import { normalizeCategory } from '../utils/categories';

// API Base URL
let FINANCE_API_URL = import.meta.env.VITE_API_URL || '';
if (!FINANCE_API_URL.endsWith('/api')) {
  FINANCE_API_URL = `${FINANCE_API_URL.replace(/\/$/, '')}/api`;
}

export { FINANCE_API_URL };

export const DEFAULT_SETTINGS = {
  user_salary: 50000,
  default_rent: 15000,
  landlord_name: '',
  housing_type: 'renda',
  financial_month_start_day: 25,
  daily_entry_reminder_enabled: true,
  daily_entry_reminder_time: '20:00',
  monthly_due_reminder_enabled: true,
  monthly_due_reminder_time: '08:00',
  monthly_due_reminder_period: 'inicio',
  debt_due_reminder_enabled: true,
  onboarding_completed: true,
  subscription_tier: 'free'
};

// --- Parsers & Normalizers ---

function parseBooleanSetting(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return fallback;
}

export function normalizeSettings(rawSettings = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...rawSettings,
    financial_month_start_day: Number(rawSettings.financial_month_start_day || DEFAULT_SETTINGS.financial_month_start_day),
    daily_entry_reminder_enabled: parseBooleanSetting(
      rawSettings.daily_entry_reminder_enabled,
      DEFAULT_SETTINGS.daily_entry_reminder_enabled
    ),
    daily_entry_reminder_time: rawSettings.daily_entry_reminder_time || DEFAULT_SETTINGS.daily_entry_reminder_time,
    monthly_due_reminder_enabled: parseBooleanSetting(
      rawSettings.monthly_due_reminder_enabled,
      DEFAULT_SETTINGS.monthly_due_reminder_enabled
    ),
    monthly_due_reminder_time: rawSettings.monthly_due_reminder_time || DEFAULT_SETTINGS.monthly_due_reminder_time,
    monthly_due_reminder_period:
      rawSettings.monthly_due_reminder_period === 'fim' ? 'fim' : DEFAULT_SETTINGS.monthly_due_reminder_period,
    debt_due_reminder_enabled: parseBooleanSetting(
      rawSettings.debt_due_reminder_enabled,
      DEFAULT_SETTINGS.debt_due_reminder_enabled
    ),
    subscription_tier: rawSettings.subscription_tier || 'pro'
  };
}

// --- Mappers ---

export function mapTransaction(t) {
  return {
    id: t.id,
    data: t.date,
    tipo: t.type,
    desc: t.description,
    valor: Number(t.amount || 0),
    cat: normalizeCategory(t.category),
    nota: t.note,
    account_id: t.account_id
  };
}

export function mapRental(r) {
  return {
    id: r.id,
    mes: r.month,
    proprietario: r.landlord,
    valor: Number(r.amount || 0),
    estado: r.status,
    obs: r.notes
  };
}

export function mapGoal(m) {
  return {
    id: m.id,
    nome: m.name,
    alvo: Number(m.target_amount || 0),
    poupado: Number(m.saved_amount || 0),
    prazo: m.deadline,
    cat: normalizeCategory(m.category),
    mensal: Number(m.monthly_saving || 0)
  };
}

export function mapAccount(acc) {
  return {
    ...acc,
    initial_balance: Number(acc.initial_balance || 0),
    current_balance: Number(acc.current_balance || 0)
  };
}

export function mapXitique(x) {
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

// --- Fetching Logic ---

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

export async function fetchAllData(headers, dispatch) {
  try {
    const res = await fetch(`${FINANCE_API_URL}/dashboard-summary`, { headers });
    
    if (res.status === 401) {
      localStorage.removeItem('mwanga-token');
      if (dispatch) dispatch({ type: 'RESET_SESSION' });
      return null;
    }

    if (res.ok) {
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

    const endpoints = [
      `${FINANCE_API_URL}/transactions`, `${FINANCE_API_URL}/rentals`,
      `${FINANCE_API_URL}/goals`, `${FINANCE_API_URL}/budgets`,
      `${FINANCE_API_URL}/assets`, `${FINANCE_API_URL}/liabilities`,
      `${FINANCE_API_URL}/xitiques`, `${FINANCE_API_URL}/settings`,
      `${FINANCE_API_URL}/auth/me`, `${FINANCE_API_URL}/debts`,
      `${FINANCE_API_URL}/accounts`, `${FINANCE_API_URL}/credit/applications`,
      `${FINANCE_API_URL}/credit/loans`
    ];

    const results = await batchFetch(
      endpoints.map(url => () => fetch(url, { headers }).then(r => {
        if (r.status === 401) {
          localStorage.removeItem('mwanga-token');
          if (dispatch) dispatch({ type: 'RESET_SESSION' });
          return [];
        }
        return r.ok ? r.json() : [];
      }))
    );

    return {
      ts: results[0], rendas: results[1], metas: results[2], budgets: results[3],
      assets: results[4], liabs: results[5], xitiques: results[6], settingsResp: results[7],
      user: results[8], debts: results[9], accounts: results[10],
      loanApplications: results[11], loans: results[12]
    };
  } catch (err) {
    console.error('Fetch all data failed:', err);
    throw err;
  }
}

// --- Generic API call helper ---

export async function apiCall(endpoint, method = 'GET', body = null, headers = {}) {
  const token = localStorage.getItem('mwanga-token');
  const fullHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...headers
  };

  const response = await fetch(`${FINANCE_API_URL}/${endpoint}`, {
    method,
    headers: fullHeaders,
    body: body ? JSON.stringify(body) : null
  });

  if (response.status === 401) {
    localStorage.removeItem('mwanga-token');
    window.location.reload();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    let errorMsg = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorData.error || errorMsg;
    } catch { /* ignore */ }
    throw new Error(errorMsg);
  }

  return response.status === 204 ? null : response.json();
}
