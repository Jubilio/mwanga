// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { FinanceContext } from '../hooks/FinanceContext';
import api from '../utils/api';
import SmsImport from './SmsImport';

vi.mock('../hooks/useSmsSync', () => ({ useSmsSync: () => ({ syncSms: vi.fn() }) }));
vi.mock('../utils/api', () => ({ default: { post: vi.fn() } }));

const BCI_PURCHASE = 'Caro Cliente, registamos uma compra de 2.580,00 MZN a 31/10/2026 15:46 na(o) CENTRO MED com cartao ***5710. Se nao reconhece, ligue gratis 800224224/(+258)21224224.';
const PARSED = {
  is_financial: true, bank_name: 'BCI', transaction_type: 'payment', transaction_id: null,
  account_number: '***5710', amount: 2580, currency: 'MZN', fee_amount: null, balance_after: null,
  recipient_name: 'CENTRO MED', recipient_account: null, agent_code: null, description: BCI_PURCHASE,
  transaction_datetime: '2026-10-31T15:46:00', confidence_score: 0.94,
};

let root, host, showToast, reloadData;
const state = {
  settings: { subscription_tier: 'pro', default_expense_account_id: 7 },
  transacoes: [],
  contas: [{ id: 3, name: 'BCI Conta' }, { id: 7, name: 'Carteira' }],
};

beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('en');
  showToast = vi.fn();
  reloadData = vi.fn().mockResolvedValue(undefined);
  api.post.mockReset();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(
    <FinanceContext.Provider value={{ state, dispatch: vi.fn(), reloadData }}>
      <MemoryRouter>
        <Routes>
          <Route element={<Outlet context={{ showToast }} />}>
            <Route path="/" element={<SmsImport />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </FinanceContext.Provider>,
  ));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); await i18n.changeLanguage('pt'); });

const button = (text) => [...host.querySelectorAll('button')].find((el) => el.textContent.trim().includes(text));

async function analyse() {
  const textarea = host.querySelector('textarea');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, BCI_PURCHASE);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  api.post.mockResolvedValueOnce({ data: { data: { parsed_data: PARSED } } });
  await act(async () => button('Analyze').click());
}

it('saves the parsed SMS when Confirm is tapped', async () => {
  await analyse();
  api.post.mockResolvedValueOnce({ data: { id: 99 } });
  await act(async () => button('Confirm and Log to Account').click());

  const [url, payload] = api.post.mock.calls[1];
  expect(url).toBe('/transactions');
  expect(payload).toMatchObject({ date: '2026-10-31', type: 'despesa', amount: 2580, category: 'other', account_id: 3 });
  expect(payload.description).toContain('CENTRO MED');
  expect(payload.note).toContain('SMS: ');
  expect(showToast).toHaveBeenCalledWith('Transaction recorded successfully!', 'success');
  expect(reloadData).toHaveBeenCalled();
});

it('shows why the save failed instead of doing nothing', async () => {
  await analyse();
  api.post.mockRejectedValueOnce({ response: { status: 400, data: { error: 'Validation failed' } } });
  await act(async () => button('Confirm and Log to Account').click());

  expect(showToast).toHaveBeenCalledWith('Validation failed', 'error');
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Validation failed');
  // The parsed result stays on screen so the user can try again.
  expect(button('Confirm and Log to Account')).toBeTruthy();
});
