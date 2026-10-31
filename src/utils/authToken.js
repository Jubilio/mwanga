import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

/**
 * Session token storage.
 *
 * On the web the token lives in localStorage. In the Android app it is kept in the
 * Keystore-backed secure storage and mirrored in memory, so the many synchronous
 * readers keep working. `loadToken()` must run once before the app renders.
 */
const KEY = 'mwanga-token';
const isNative = Capacitor.isNativePlatform();
let nativeToken = null;

export function getToken() {
  return isNative ? nativeToken : localStorage.getItem(KEY);
}

export function setToken(token) {
  if (!isNative) {
    localStorage.setItem(KEY, token);
    return;
  }
  nativeToken = token;
  SecureStoragePlugin.set({ key: KEY, value: token }).catch(() => {});
}

export function clearToken() {
  localStorage.removeItem(KEY);
  if (!isNative) return;
  nativeToken = null;
  SecureStoragePlugin.remove({ key: KEY }).catch(() => {});
}

export async function loadToken() {
  if (!isNative) return;
  try {
    const { value } = await SecureStoragePlugin.get({ key: KEY });
    nativeToken = value || null;
  } catch {
    nativeToken = null;
  }
  // Move a session saved by earlier builds out of plain localStorage.
  const legacy = localStorage.getItem(KEY);
  if (legacy) {
    if (!nativeToken) setToken(legacy);
    localStorage.removeItem(KEY);
  }
}

// The user id inside the session token (read only, not verified: the server checks it).
// Used to make sure a profile cached on this device belongs to whoever is signed in.
export function tokenUserId(token = getToken()) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '='));
    const id = JSON.parse(json)?.id;
    return id === undefined || id === null ? null : String(id);
  } catch {
    return null;
  }
}
