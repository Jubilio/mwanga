// @vitest-environment jsdom
import { act, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import i18n from '../i18n';
import { FinanceContext } from '../hooks/FinanceContext';
import Settings from './Settings';
vi.mock('../hooks/usePushNotifications', () => ({ usePushNotifications: () => ({ isSupported: false, isSubscribed: false, isLoading: false, permission: 'default' }) }));
vi.mock('../hooks/useSmsSync', () => ({ useSmsSync: () => ({ syncSms: vi.fn() }) }));
let root, host, request, latest;
const initial = () => ({ user: { id: 1, name: 'Jubilio', whatsapp_number: '' }, settings: { household_name: 'Family', user_salary: 0, default_rent: 0, cash_balance: 0, financial_month_start_day: 25, subscription_tier: 'free' }, contas: [], darkMode: false });
function Fixture() {
  const [state, setState] = useState(initial);
  useEffect(() => { latest = state; }, [state]);
  const dispatch = async action => {
    await request(action);
    setState(previous => action.type === 'UPDATE_USER' ? { ...previous, user: { ...previous.user, ...Object.fromEntries(Object.entries(action.payload).filter(([key]) => key !== 'password')) } } : action.type === 'UPDATE_SETTING' ? { ...previous, settings: { ...previous.settings, [action.payload.key]: action.payload.value } } : previous);
  };
  return <FinanceContext.Provider value={{ state, dispatch }}><MemoryRouter><Routes><Route element={<Outlet context={{ showToast: vi.fn() }} />}><Route path="/" element={<Settings />} /></Route></Routes></MemoryRouter></FinanceContext.Provider>;
}
beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('en'); request = vi.fn().mockResolvedValue(undefined);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(<Fixture />));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); await i18n.changeLanguage('pt'); });
async function change(id, value) {
  const element = host.querySelector(`#${id}`);
  const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value); element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
const button = text => [...host.querySelectorAll('button')].find(element => element.textContent.trim() === text);
async function click(text) { await act(async () => button(text).click()); }
it('requires explicit password confirmation and never auto-saves while typing', async () => {
  vi.useFakeTimers();
  await change('settings-password', 'long-password');
  await act(async () => vi.advanceTimersByTimeAsync(2000));
  expect(request).not.toHaveBeenCalled();
  await change('settings-password-confirm', 'other-password');
  await act(async () => host.querySelector('#settings-password').closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(request).not.toHaveBeenCalled(); expect(host.textContent).toContain('The passwords do not match.');
  await change('settings-password-confirm', 'long-password');
  await act(async () => host.querySelector('#settings-password').closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(request).toHaveBeenCalledWith({ type: 'UPDATE_USER', payload: { password: 'long-password' } });
  expect(host.querySelector('#settings-password').value).toBe('');
});
it('keeps a failed cycle save pending and retries the actual financial month key', async () => {
  await click('Language and appearance');
  await change('settings-financial_month_start_day', '31');
  expect(request).not.toHaveBeenCalled();
  request.mockRejectedValueOnce(new Error('offline'));
  await click('Save changes');
  expect(latest.settings.financial_month_start_day).toBe(25);
  expect(host.querySelector('#settings-financial_month_start_day').value).toBe('31');
  expect(host.textContent).toContain('One or more changes were not saved');
  await click('Save changes');
  expect(latest.settings.financial_month_start_day).toBe(31);
  expect(button('Save changes').disabled).toBe(true);
});
it('retains successful changes and retries only failed fields after a partial save', async () => {
  await change('settings-user_name', 'New name');
  await click('Household and finances');
  await change('settings-user_salary', '250');
  request.mockImplementation(async action => { if (action.type === 'UPDATE_SETTING') throw new Error('offline'); });
  await click('Save changes');
  expect(latest.user.name).toBe('New name'); expect(latest.settings.user_salary).toBe(0);
  request.mockReset().mockResolvedValue(undefined);
  await click('Save changes');
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith({ type: 'UPDATE_SETTING', payload: { key: 'user_salary', value: 250 } });
});
it('can discard pending changes and keeps English controls fully localized', async () => {
  await change('settings-user_name', 'Unsaved'); await click('Discard changes');
  expect(host.querySelector('#settings-user_name').value).toBe('Jubilio');
  expect(host.textContent).not.toMatch(/Número de WhatsApp|Guardar|MILITAR|Definir\/Alterar/);
  expect(host.querySelector('#settings-whatsapp_number').labels.length).toBe(1);
});
