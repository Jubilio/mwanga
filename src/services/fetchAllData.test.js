import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../utils/authToken', () => ({ getToken: vi.fn(), clearToken: vi.fn() }));
import { fetchAllData, DataLoadError } from './finance.service';
import { clearToken } from '../utils/authToken';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const noDelay = { retryDelays: [0, 0, 0] };
beforeEach(() => { globalThis.fetch = vi.fn(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

it('retries a cold-starting server instead of returning empty data', async () => {
  fetch.mockResolvedValueOnce(json({}, 503)).mockRejectedValueOnce(new TypeError('Failed to fetch'))
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
