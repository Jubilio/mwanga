// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { FinanceProvider } from './useFinanceStore';
import { useFinance } from './useFinance';
import { apiCall, fetchAllData } from '../services/finance.service';
import { db } from '../db/db';
vi.mock('./useOfflineSync', () => ({ useOfflineSync: () => {} }));
vi.mock('../db/db', () => {
  const table = () => ({ clear: vi.fn(async () => {}), bulkPut: vi.fn(async () => {}), put: vi.fn(async () => {}), update: vi.fn(async () => {}), get: vi.fn(async () => undefined), toArray: vi.fn(async () => []) });
  return { db: { transacoes: table(), budgets: table(), metas: table(), rendas: table(), settings: table() } };
});
vi.mock('../services/finance.service', async importOriginal => ({ ...await importOriginal(), apiCall: vi.fn(), fetchAllData: vi.fn(), refreshSessionToken: vi.fn() }));

const jwt = id => `h.${btoa(JSON.stringify({ id, householdId: 3 })).replace(/=+$/, '')}.s`;
const summary = user => ({ ts: [], rendas: [], metas: [], budgets: [], assets: [], liabs: [], xitiques: [], accounts: [], debts: [], settingsResp: { household_name: 'Family' }, user });
let context, root;
function Probe() { const value = useFinance(); useEffect(() => { context = value; }, [value]); return null; }
async function mount() {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  root = createRoot(document.createElement('div'));
  await act(async () => { root.render(<FinanceProvider><Probe /></FinanceProvider>); });
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
}
afterEach(async () => { await act(async () => root.unmount()); localStorage.clear(); vi.clearAllMocks(); });

it('asks /auth/me when the summary has no profile, keeping only public fields', async () => {
  localStorage.setItem('mwanga-token', jwt(1));
  fetchAllData.mockResolvedValue(summary(null));
  apiCall.mockResolvedValue({ id: 1, name: 'Jubilio Mausse', email: 'j@x.mz', role: 'user', nationalId: '123' });
  await mount();
  expect(apiCall).toHaveBeenCalledWith('auth/me');
  expect(context.state.user).toEqual({ id: 1, name: 'Jubilio Mausse', email: 'j@x.mz', role: 'user' });
});

it('shows the cached profile when the server is down, only for the same account', async () => {
  localStorage.setItem('mwanga-token', jwt(1));
  db.settings.get.mockImplementation(async key => (key === 'user_profile' ? { id: 'user_profile', userId: 1, name: 'Jubilio Mausse' } : undefined));
  fetchAllData.mockRejectedValue(new Error('offline'));
  await mount();
  expect(context.state.user).toEqual({ id: 1, name: 'Jubilio Mausse' });
  expect(context.state.loadError).toBeTruthy();
});

it('never shows a profile cached for another account', async () => {
  localStorage.setItem('mwanga-token', jwt(7));
  db.settings.get.mockImplementation(async key => (key === 'user_profile' ? { id: 'user_profile', userId: 1, name: 'Ana' } : undefined));
  fetchAllData.mockRejectedValue(new Error('offline'));
  await mount();
  expect(context.state.user).toBeNull();
});

it('saves the profile under its own row key', async () => {
  localStorage.setItem('mwanga-token', jwt(1));
  fetchAllData.mockResolvedValue(summary({ id: 1, name: 'Jubilio Mausse' }));
  await mount();
  expect(db.settings.put).toHaveBeenCalledWith({ id: 'user_profile', userId: 1, name: 'Jubilio Mausse' });
});
