import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../utils/authToken', () => ({ getToken: vi.fn(), setToken: vi.fn(), clearToken: vi.fn() }));
vi.mock('../utils/api', () => ({ default: { get: vi.fn(), request: vi.fn() } }));
import { fetchAllData, DataLoadError } from './finance.service';
import { clearToken } from '../utils/authToken';
import api from '../utils/api';

const json = (data, status = 200) => ({ status, data });
const noDelay = { retryDelays: [0, 0, 0] };
const fetch = api.get;
beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); api.get.mockReset(); });

it('retries a cold-starting server instead of returning empty data', async () => {
  fetch.mockResolvedValueOnce(json({}, 503)).mockRejectedValueOnce(new Error('Network Error'))
    .mockResolvedValueOnce(json({ transactions: [{ id: 1 }], budgets: [{ id: 2 }] }));
  const data = await fetchAllData({}, vi.fn(), noDelay);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(data.ts).toEqual([{ id: 1 }]);
  expect(data.budgets).toEqual([{ id: 2 }]);
});

it('throws with the status when the server keeps failing, so the app never shows zeros', async () => {
  fetch.mockImplementation(async () => json({ error: 'down' }, 503));
  const err = await fetchAllData({}, vi.fn(), noDelay).catch(e => e);
  expect(err).toBeInstanceOf(DataLoadError);
  expect(err.status).toBe(503);
});

it('falls back to individual endpoints when only the summary fails', async () => {
  fetch.mockImplementation(async url => (String(url).endsWith('/dashboard-summary') ? json({}, 404) : json(String(url).endsWith('/transactions') ? [{ id: 7 }] : [])));
  const data = await fetchAllData({}, vi.fn(), noDelay);
  expect(data.ts).toEqual([{ id: 7 }]);
});

it('ends the session on 401', async () => {
  const dispatch = vi.fn();
  fetch.mockResolvedValueOnce(json({}, 401));
  expect(await fetchAllData({}, dispatch, noDelay)).toBeNull();
  expect(clearToken).toHaveBeenCalled();
  expect(dispatch).toHaveBeenCalledWith({ type: 'RESET_SESSION' });
});

it('parses a JSON body that arrives as text from the native HTTP bridge', async () => {
  fetch.mockResolvedValueOnce(json(JSON.stringify({ transactions: [{ id: 3 }], accounts: [{ id: 4 }] })));
  const data = await fetchAllData({}, vi.fn(), noDelay);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(data.ts).toEqual([{ id: 3 }]);
  expect(data.accounts).toEqual([{ id: 4 }]);
});

it('treats a non-JSON 200 as a failed load instead of an empty household', async () => {
  fetch.mockImplementation(async () => json('<html>Service waking up</html>'));
  const err = await fetchAllData({}, vi.fn(), noDelay).catch(e => e);
  expect(err).toBeInstanceOf(DataLoadError);
});

it('stores the refreshed session token so a returning user stays signed in', async () => {
  const { refreshSessionToken } = await import('./finance.service');
  const { getToken, setToken } = await import('../utils/authToken');
  getToken.mockReturnValue('old');
  api.post = vi.fn().mockResolvedValue({ status: 200, data: { token: 'new' } });
  expect(await refreshSessionToken()).toBe('new');
  expect(setToken).toHaveBeenCalledWith('new');
});

it('keeps the current token when the refresh fails', async () => {
  const { refreshSessionToken } = await import('./finance.service');
  const { getToken, setToken } = await import('../utils/authToken');
  getToken.mockReturnValue('old');
  setToken.mockClear();
  api.post = vi.fn().mockRejectedValue(new Error('Network Error'));
  expect(await refreshSessionToken()).toBeNull();
  expect(setToken).not.toHaveBeenCalled();
});
