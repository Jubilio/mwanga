// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TransactionsForm from './TransactionsForm';

let root, host;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); });

const base = {
  isOpen: true, handleSubmit: vi.fn(), editingId: null, setIsMagicPasteOpen: vi.fn(), setForm: vi.fn(),
  t: (k) => k, TYPES: [{ value: 'despesa', label: 'Despesa' }],
  CATEGORIES: [{ id: 'food', key: 'food' }, { id: 'transport', key: 'transport' }],
  currency: 'MT', accounts: [],
};
const form = { data: '2026-11-11', tipo: 'despesa', desc: 'Tio Zeca', valor: '', cat: 'transport', account_id: '' };

it('says the category came from the history and passes typing and picking to the page', () => {
  const onDescChange = vi.fn();
  const onCategoryChange = vi.fn();
  act(() => root.render(<TransactionsForm {...base} form={form} onDescChange={onDescChange} onCategoryChange={onCategoryChange} catSuggestion={{ category: 'transport', source: 'memory' }} />));
  expect(host.textContent).toContain('Sugerida pelo teu histórico');

  const [descInput] = host.querySelectorAll('input[type="text"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  act(() => { setter.call(descInput, 'Tio Zeca chapa'); descInput.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(onDescChange).toHaveBeenCalledWith('Tio Zeca chapa');

  const categorySelect = [...host.querySelectorAll('select')].find((s) => s.value === 'transport');
  act(() => { categorySelect.value = 'food'; categorySelect.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(onCategoryChange).toHaveBeenCalledWith('food');
});

it('shows no hint without a suggestion', () => {
  act(() => root.render(<TransactionsForm {...base} form={form} catSuggestion={null} />));
  expect(host.textContent).not.toContain('Sugerida');
});
