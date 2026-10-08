// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { FinanceContext } from '../hooks/FinanceContext';
import api from '../utils/api';
import RealityReview from './RealityReview';
vi.mock('../utils/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
let host, root, data, dispatch;
const record = () => ({ status: { needsReview: true, sections: Object.fromEntries(['balances', 'commitments', 'plan'].map((key, index) => [key, { fingerprint: String(index + 1).repeat(64), confirmed: false, confirmedAt: null, changed: false }])) }, snapshot: { balances: { cash: 100, accounts: [{ id: 7, name: 'Bank', balance: 10000 }] }, commitments: { salary: 5000, rent: 1000, landlord: '', debts: [] }, plan: { goals: [], budgets: [], journey: null } }, adjustments: [] });
beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks(); await i18n.changeLanguage('en'); data = record(); dispatch = vi.fn().mockResolvedValue(undefined);
  api.get.mockImplementation(async () => ({ data: structuredClone(data) }));
  api.patch.mockImplementation(async (_url, command) => { if (command.action === 'confirm') data.status.sections[command.section].confirmed = true; if (command.action === 'finish') data.status.needsReview = false; return { data: {} }; });
  api.post.mockResolvedValue({ data: {} });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(<FinanceContext.Provider value={{ state: { user: { id: 3 } }, dispatch }}><MemoryRouter><RealityReview /></MemoryRouter></FinanceContext.Provider>));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); await i18n.changeLanguage('pt'); });
const button = text => [...host.querySelectorAll('button')].find(element => element.textContent.trim() === text);
async function click(text) { await act(async () => button(text).click()); }
async function change(id, value) {
  const input = host.querySelector(`#${id}`);
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
it('confirms steps, saves progress and prevents completion until all data is reviewed', async () => {
  expect(button('Finish review').disabled).toBe(true);
  await click('I confirm this step’s data');
  expect(api.patch).toHaveBeenCalledWith('/reality-review', { action: 'confirm', section: 'balances', fingerprint: '1'.repeat(64) });
  await click('2. What comes in and goes out'); await click('I confirm this step’s data');
  await click('3. What I want to achieve'); await click('I confirm this step’s data');
  expect(button('Finish review').disabled).toBe(false);
  await click('Finish review'); expect(host.textContent).toContain('Review completed.');
});
it('keeps a rejected adjustment draft and its request ID for a safe retry', async () => {
  const updateButtons = [...host.querySelectorAll('button')].filter(element => element.textContent === 'Update balance');
  await act(async () => updateButtons[1].click());
  await change('reality-balance', '6500'); await change('reality-reason', 'Bank balance checked');
  api.post.mockRejectedValueOnce(new Error('offline'));
  await act(async () => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(host.querySelector('#reality-balance').value).toBe('6500');
  const first = api.post.mock.calls[0][1];
  await act(async () => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(api.post.mock.calls[1][1].requestId).toBe(first.requestId);
  expect(first).toMatchObject({ accountId: 7, expectedBalance: 10000, balance: 6500, reason: 'Bank balance checked' });
  expect(dispatch).toHaveBeenCalledWith({ type: 'REFRESH_REALITY' });
});
it('shows conflict instructions rather than falsely confirming stale data', async () => {
  api.patch.mockRejectedValueOnce({ response: { data: { error: 'DATA_CHANGED' } } });
  await click('I confirm this step’s data');
  expect(host.textContent).toContain('The data changed since you saw it.');
  expect(host.textContent).not.toContain('Step confirmed and progress saved.');
  expect(button('Finish review').disabled).toBe(true);
});
it('does not resend an adjustment when it was saved but refreshing failed', async () => {
  await click('Update balance'); await change('reality-balance', '50'); await change('reality-reason', 'Cash checked');
  api.get.mockRejectedValueOnce(new Error('offline'));
  await act(async () => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(host.querySelector('form')).toBeNull();
  expect(host.textContent).toContain('The change was saved');
  expect(api.post).toHaveBeenCalledTimes(1);
});
