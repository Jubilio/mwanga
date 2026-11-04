// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
vi.mock('../../services/finance.service', () => ({ apiCall: vi.fn() }));
vi.mock('../../hooks/useFinance', () => ({ useFinance: () => ({ state: { settings: {} }, dispatch: mockDispatch }) }));
const mockDispatch = vi.fn(async () => 'saved');
import { apiCall } from '../../services/finance.service';
import TodayCard from './TodayCard';
import { maskAmounts } from '../../utils/advisorProposal';

const today = {
  top: { id: 'due:x9:2026-11-12', kind: 'due', priority: 1, title: 'Xitique due today', body: 'Amigas: 1,500 MT.', action: { type: 'proposal', label: 'Mark as paid', proposal: { action: 'pay_xitique', payload: { contributionId: 9 } } } },
  forecast: { horizon: '2026-11-25', horizonIsPayday: true, runoutDate: '2026-11-20', endBalance: -900 },
  disclaimer: 'Binth helps you get organised.',
};
let root, host;
async function mount(props = {}) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(<MemoryRouter><TodayCard {...props} /></MemoryRouter>));
}
beforeEach(async () => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; vi.clearAllMocks(); await i18n.changeLanguage('en'); apiCall.mockResolvedValue(today); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); await i18n.changeLanguage('pt'); });

it('shows the top alert, the forecast and the notice', async () => {
  await mount();
  expect(host.textContent).toContain('Xitique due today');
  expect(host.textContent).toContain('money runs out on 20/11');
  expect(host.textContent).toContain('Binth helps you get organised.');
});

it('runs the proposal once with a stable request id', async () => {
  await mount();
  const button = [...host.querySelectorAll('button')].find(b => b.textContent === 'Mark as paid');
  await act(async () => button.click());
  expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'PAY_XITIQUE', requestId: expect.stringContaining('advisor-due-x9') }));
  expect(host.querySelector('[role="status"]').textContent).toMatch(/Done/);
});

it('hides amounts when the balance is hidden', async () => {
  expect(maskAmounts('Amigas: 1,500 MT.', true)).toBe('Amigas: ••• MT.');
  await mount({ hidden: true });
  expect(host.textContent).not.toContain('1,500');
});

it('offers a retry when loading fails', async () => {
  apiCall.mockRejectedValueOnce(new Error('offline'));
  await mount();
  expect(host.textContent).toContain('Try again');
});
