import { getSmsPermission } from './moneySms';

/**
 * Lets any code ask for SMS access through the explanation sheet
 * (SmsPermissionSheet, mounted once in Layout) instead of firing the bare
 * Android dialog. Resolves true once READ_SMS is granted.
 */
let listener = null;

export function onSmsAccessRequest(handler) {
  listener = handler;
  return () => {
    if (listener === handler) listener = null;
  };
}

export async function ensureSmsAccess() {
  const state = await getSmsPermission();
  if (state === 'granted') return true;
  if (state === 'unavailable' || !listener) return false;
  return new Promise(resolve => listener({ state, resolve }));
}
