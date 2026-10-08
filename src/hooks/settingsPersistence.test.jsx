// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { FinanceProvider } from './useFinanceStore';
import { useFinance } from './useFinance';
import { apiCall, fetchAllData } from '../services/finance.service';
import { db } from '../db/db';
vi.mock('./useOfflineSync', () => ({ useOfflineSync: () => {} }));
vi.mock('../db/db', () => {
  const table = () => ({ clear: vi.fn(async () => {}), bulkPut: vi.fn(async () => {}), put: vi.fn(async () => {}), update: vi.fn(async () => {}) });
  return { db: { transacoes: table(), budgets: table(), metas: table(), rendas: table(), settings: table() } };
});
vi.mock('../services/finance.service', async importOriginal => ({ ...await importOriginal(), apiCall: vi.fn(), fetchAllData: vi.fn() }));
let context, root, host;
function Probe() { const value = useFinance(); useEffect(() => { context = value; }, [value]); return null; }
beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks(); localStorage.setItem('mwanga-token', 'test-token');
  fetchAllData.mockResolvedValue({ ts: [], rendas: [], metas: [], budgets: [], assets: [], liabs: [], xitiques: [], accounts: [], debts: [], settingsResp: { household_name: 'Family', cash_balance: 0, user_salary: 0 }, user: { id: 1, name: 'Jubilio' } });
  apiCall.mockResolvedValue({ success: true });
  host = document.createElement('div'); root = createRoot(host);
  await act(async () => { root.render(<FinanceProvider><Probe /></FinanceProvider>); });
});
afterEach(async () => { await act(async () => root.unmount()); localStorage.clear(); });
it('waits for server confirmation before changing settings', async () => {
  let resolve;
  apiCall.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  let pending;
  await act(async () => { pending = context.dispatch({ type: 'UPDATE_SETTING', payload: { key: 'user_salary', value: 250 } }); });
  expect(context.state.settings.user_salary).toBe(0);
  await act(async () => { resolve({ success: true }); await pending; });
  expect(context.state.settings.user_salary).toBe(250);
  expect(db.settings.update).toHaveBeenCalledWith('current', { user_salary: 250 });
});
it('leaves profile and financial values unchanged when requests fail', async () => {
  apiCall.mockRejectedValue(new Error('offline'));
  await act(async () => {
    await expect(context.dispatch({ type: 'UPDATE_USER', payload: { name: 'Unsaved', password: 'secret-password' } })).rejects.toThrow('offline');
    await expect(context.dispatch({ type: 'UPDATE_HOUSEHOLD', payload: { cash_balance: 999 } })).rejects.toThrow('offline');
  });
  expect(context.state.user.name).toBe('Jubilio'); expect(context.state.settings.cash_balance).toBe(0);
  expect(context.state.user).not.toHaveProperty('password');
  expect(db.settings.update).not.toHaveBeenCalled();
});
it('sends a confirmed password only to the API and never to state or offline cache', async () => {
  await act(async () => context.dispatch({ type: 'UPDATE_USER', payload: { name: 'Confirmed', password: 'secret-password' } }));
  expect(apiCall).toHaveBeenCalledWith('auth/profile', 'PUT', { name: 'Confirmed', password: 'secret-password' });
  expect(context.state.user.name).toBe('Confirmed');
  expect(context.state.user).not.toHaveProperty('password');
  expect(db.settings.update).toHaveBeenCalledWith('user_profile', { name: 'Confirmed' });
  expect(JSON.stringify(db.settings.update.mock.calls)).not.toContain('secret-password');
});
