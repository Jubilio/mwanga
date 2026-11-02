// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import DeleteAccountSettings from './DeleteAccountSettings';
import api from '../../utils/api';
import { clearToken } from '../../utils/authToken';

vi.mock('../../utils/api', () => ({ default: { delete: vi.fn() } }));
vi.mock('../../utils/authToken', () => ({ clearToken: vi.fn() }));

let root, host;
beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  await i18n.changeLanguage('pt');
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(<DeleteAccountSettings />));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

async function type(value) {
  const input = host.querySelector('#delete-account-confirm');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const button = () => host.querySelector('button[type="submit"]');

it('keeps the button disabled until APAGAR is typed', async () => {
  expect(button().disabled).toBe(true);
  await type('apaga');
  expect(button().disabled).toBe(true);
  await type('apagar');
  expect(button().disabled).toBe(false);
});

it('keeps the session when the server refuses', async () => {
  api.delete.mockRejectedValue(new Error('offline'));
  await type('APAGAR');
  await act(async () => button().click());
  expect(api.delete).toHaveBeenCalledWith('/auth/account', { data: { confirmation: 'APAGAR' } });
  expect(clearToken).not.toHaveBeenCalled();
  expect(host.querySelector('[role="alert"]').textContent).toContain('Nada foi apagado');
});
