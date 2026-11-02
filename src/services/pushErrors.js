// Turns a failure from enablePush() into a translation key, the values for it,
// and a short code the user can send us. Every path that can fail while enabling
// notifications ends up here, so the toast always says why.
const CODE_KEYS = {
  PUSH_NOT_CONFIGURED: 'web_not_configured',
  NATIVE_PUSH_NOT_CONFIGURED: 'native_not_configured',
  SERVICE_WORKER_NOT_READY: 'service_worker',
  REGISTRATION_FAILED: 'fcm_failed',
  REGISTRATION_TIMEOUT: 'fcm_timeout',
  PUSH_BUSY: 'busy',
};

export function describePushError(error, { isNative = false } = {}) {
  const message = error?.message || '';
  if (message === 'PERMISSION_DENIED' || message === 'BLOCKED_BY_BROWSER') {
    return { key: isNative ? 'denied_native' : 'denied_web', values: {}, code: 'PERMISSION_DENIED' };
  }
  if (CODE_KEYS[message]) {
    return { key: CODE_KEYS[message], values: { detail: error.detail || '' }, code: error.detail ? `${message}: ${error.detail}` : message };
  }
  if (error?.isAxiosError || error?.config) {
    const status = error.response?.status;
    if (!error.response) return { key: 'offline', values: {}, code: 'NETWORK' };
    if (status === 401 || status === 403) return { key: 'session', values: {}, code: `HTTP ${status}` };
    const serverMessage = error.response?.data?.message || '';
    return { key: 'server', values: { status }, code: serverMessage ? `HTTP ${status}: ${serverMessage}` : `HTTP ${status}` };
  }
  // pushManager.subscribe() rejects with DOMExceptions such as NotAllowedError or AbortError.
  if (error?.name === 'NotAllowedError') return { key: 'denied_web', values: {}, code: 'NotAllowedError' };
  // The browser could not reach its own push service (Brave with Google push off,
  // a browser without Google services, or a network/VPN that blocks it).
  if (error?.name === 'AbortError' && /push service/i.test(message)) {
    return { key: 'browser_push_service', values: {}, code: `AbortError: ${message}` };
  }
  return { key: 'unknown', values: {}, code: [error?.name, message].filter(Boolean).join(': ') || 'UNKNOWN' };
}
