// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n from '../i18n';

const native = vi.hoisted(() => ({ state: 'prompt', afterRequest: 'granted', info: { sdkInt: 34, fromPlayStore: false } }));
vi.mock('../services/moneySms', () => ({
  getSmsPermission: vi.fn(async () => native.state),
  requestSmsPermission: vi.fn(async () => { native.state = native.afterRequest; return native.state; }),
  getInstallInfo: vi.fn(async () => native.info),
  needsRestrictedSettings: info => Boolean(info && info.sdkInt >= 33 && !info.fromPlayStore),
  openAppSettings: vi.fn(async () => true),
  restrictedSettingsBlocker: info => (info?.advancedProtection ? 'advanced_protection' : null),
}));

const { default: SmsPermissionSheet } = await import('./SmsPermissionSheet');
const { ensureSmsAccess } = await import('../services/smsAccess');
const { requestSmsPermission, openAppSettings } = await import('../services/moneySms');

let root, host;
beforeEach(async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  await i18n.changeLanguage('pt');
  Object.assign(native, { state: 'prompt', afterRequest: 'granted', info: { sdkInt: 34, fromPlayStore: false } });
  vi.clearAllMocks();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(
    <MemoryRouter initialEntries={['/']}>
      <SmsPermissionSheet />
      <Routes>
        <Route path="/" element={<p>home-page</p>} />
        <Route path="/sms-import" element={<p>sms-import-page</p>} />
      </Routes>
    </MemoryRouter>,
  ));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

const button = text => [...document.querySelectorAll('button')].find(b => b.textContent.includes(text));
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });

it('explains before asking Android, and resolves once granted', async () => {
  let result;
  await act(async () => { ensureSmsAccess().then(r => { result = r; }); });
  await flush();
  expect(document.body.textContent).toContain('Só lemos SMS do M-Pesa, e-Mola, mKesh');
  expect(requestSmsPermission).not.toHaveBeenCalled();
  await act(async () => button('Permitir acesso às SMS').click());
  await flush();
  expect(requestSmsPermission).toHaveBeenCalledTimes(1);
  expect(result).toBe(true);
});

it('offers to try again after a single refusal', async () => {
  native.afterRequest = 'prompt-with-rationale';
  await act(async () => { ensureSmsAccess(); });
  await flush();
  await act(async () => button('Permitir acesso às SMS').click());
  await flush();
  expect(document.body.textContent).toContain('Sem acesso às SMS');
  expect(button('Tentar de novo')).toBeTruthy();
});

it('guides through restricted settings when Android blocks the dialog for a sideloaded APK', async () => {
  native.afterRequest = 'denied';
  let result;
  await act(async () => { ensureSmsAccess().then(r => { result = r; }); });
  await flush();
  await act(async () => button('Permitir acesso às SMS').click());
  await flush();
  expect(document.body.textContent).toContain('Permitir definições restritas');
  await act(async () => button('Abrir definições da app').click());
  expect(openAppSettings).toHaveBeenCalled();

  // The user allows it in Android settings and comes back.
  native.state = 'granted';
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  await flush();
  expect(result).toBe(true);
});

it('skips the restricted-settings step for Play Store installs', async () => {
  native.state = 'denied';
  native.info = { sdkInt: 34, fromPlayStore: true };
  await act(async () => { ensureSmsAccess(); });
  await flush();
  expect(document.body.textContent).toContain('O Android bloqueou o acesso às SMS');
  expect(document.body.textContent).not.toContain('Permitir definições restritas');
});

it('resolves false when the user closes the sheet', async () => {
  let result;
  await act(async () => { ensureSmsAccess().then(r => { result = r; }); });
  await flush();
  await act(async () => button('Agora não').click());
  await flush();
  expect(result).toBe(false);
});

it('tells the user to trigger the restricted dialog before looking for the ⋮ menu', async () => {
  native.state = 'denied';
  await act(async () => { ensureSmsAccess(); });
  await flush();
  expect(document.body.textContent).toContain('Definição restrita');
  expect(document.body.textContent).toContain('Não aparecem os três pontos');
  expect(document.body.textContent).not.toContain('A Proteção avançada está ligada');
});

it('says when Advanced Protection hides the restricted settings option', async () => {
  native.state = 'denied';
  native.info = { sdkInt: 37, fromPlayStore: false, advancedProtection: true };
  await act(async () => { ensureSmsAccess(); });
  await flush();
  expect(document.body.textContent).toContain('A Proteção avançada está ligada');
});

it('offers sharing SMS as a fallback that works without the permission', async () => {
  native.state = 'denied';
  let result;
  await act(async () => { ensureSmsAccess().then(r => { result = r; }); });
  await flush();
  await act(async () => button('Partilhar SMS com o Mwanga').click());
  await flush();
  expect(result).toBe(false);
  expect(document.body.textContent).toContain('sms-import-page');
});
