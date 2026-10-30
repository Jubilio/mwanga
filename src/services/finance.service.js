import { normalizeCategory } from '../utils/categories';
import { getToken, clearToken } from '../utils/authToken';
import api from '../utils/api';

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
    sms_automation_enabled: parseBooleanSetting(rawSettings.sms_automation_enabled, false),
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
    subscription_tier: rawSettings.subscription_tier || DEFAULT_SETTINGS.subscription_tier
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

// Render's free instance takes up to a minute to wake up, so a cold start answers
// with 502/503 or drops the connection. Retry those instead of showing empty data.
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 5000, 10000];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export class DataLoadError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'DataLoadError';
    this.status = status;
  }
}

// Data requests go through axios (XMLHttpRequest). In the Android app the patched
// window.fetch never delivered GET requests to the server, while XHR requests did.
async function getJson(url, headers) {
  const res = await api.get(url, { headers, validateStatus: () => true });
  return { status: res.status, ok: res.status >= 200 && res.status < 300, data: res.data };
}

async function fetchWithRetry(url, headers, delays = RETRY_DELAYS_MS) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await getJson(url, headers);
    } catch (err) {
      if (attempt >= delays.length) throw new DataLoadError(err?.message || 'Network error', 0);
      await wait(delays[attempt]);
      continue;
    }
    if (!RETRYABLE_STATUS.has(res.status) || attempt >= delays.length) return res;
    await wait(delays[attempt]);
  }
}

export async function fetchAllData(headers, dispatch, { retryDelays = RETRY_DELAYS_MS } = {}) {
  const res = await fetchWithRetry(`${FINANCE_API_URL}/dashboard-summary`, headers, retryDelays);

  if (res.status === 401) {
    clearToken();
    if (dispatch) dispatch({ type: 'RESET_SESSION' });
    return null;
  }

  if (res.ok && res.data && typeof res.data === 'object') {
    const data = res.data;
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

  console.warn(`dashboard-summary failed with HTTP ${res.status}, falling back to individual endpoints`);

  const endpoints = [
    `${FINANCE_API_URL}/transactions`, `${FINANCE_API_URL}/rentals`,
    `${FINANCE_API_URL}/goals`, `${FINANCE_API_URL}/budgets`,
    `${FINANCE_API_URL}/assets`, `${FINANCE_API_URL}/liabilities`,
    `${FINANCE_API_URL}/xitiques`, `${FINANCE_API_URL}/settings`,
    `${FINANCE_API_URL}/auth/me`, `${FINANCE_API_URL}/debts`,
    `${FINANCE_API_URL}/accounts`, `${FINANCE_API_URL}/credit/applications`,
    `${FINANCE_API_URL}/credit/loans`
  ];
  // Without these the dashboard would show zeros as if the household had no data.
  const REQUIRED = new Set([0, 3, 7, 8, 10]);
  let unauthorized = false;
  let failedStatus = 0;

  const results = await batchFetch(
    endpoints.map((url, i) => async () => {
      try {
        const r = await getJson(url, headers);
        if (r.status === 401) unauthorized = true;
        if (r.ok) return r.data;
        if (REQUIRED.has(i)) failedStatus = failedStatus || r.status;
      } catch {
        if (REQUIRED.has(i)) failedStatus = failedStatus || -1;
      }
      return [];
    })
  );

  if (unauthorized) {
    clearToken();
    if (dispatch) dispatch({ type: 'RESET_SESSION' });
    return null;
  }
  if (failedStatus) {
    throw new DataLoadError(`HTTP ${res.status}`, res.status);
  }

  return {
    ts: results[0], rendas: results[1], metas: results[2], budgets: results[3],
    assets: results[4], liabs: results[5], xitiques: results[6], settingsResp: results[7],
    user: results[8], debts: results[9], accounts: results[10],
    loanApplications: results[11], loans: results[12]
  };
}

// --- Generic API call helper ---

export async function apiCall(endpoint, method = 'GET', body = null, headers = {}) {
  const token = getToken();
  const response = await api.request({
    url: `${FINANCE_API_URL}/${endpoint}`,
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...headers
    },
    data: body ?? undefined,
    validateStatus: () => true
  });

  if (response.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error('Unauthorized');
  }

  if (response.status < 200 || response.status >= 300) {
    const errorData = response.data && typeof response.data === 'object' ? response.data : {};
    throw new Error(errorData.message || errorData.error || `API Error: ${response.status}`);
  }

  return response.status === 204 ? null : response.data;
}
